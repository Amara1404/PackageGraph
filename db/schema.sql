-- PackageGraph relational core (PostgreSQL)
-- Matches packagegraph-er.drawio / packagegraph-er-chen.drawio

DROP TABLE IF EXISTS impact_report CASCADE;
DROP TABLE IF EXISTS vulnerability_flag CASCADE;
DROP TABLE IF EXISTS affected_range CASCADE;
DROP TABLE IF EXISTS vulnerability CASCADE;
DROP TABLE IF EXISTS dependency CASCADE;
DROP TABLE IF EXISTS application_dependency CASCADE;
DROP TABLE IF EXISTS package CASCADE;
DROP TABLE IF EXISTS application CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;

-- ===== AppUser =====
CREATE TABLE app_user (
  user_id       SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('security_admin', 'developer'))
);

-- ===== Application (owns) =====
CREATE TABLE application (
  app_id   SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  owner_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE
);

-- ===== Package =====
CREATE TABLE package (
  package_id  SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,
  description TEXT,
  UNIQUE (name, version)
);

-- ===== ApplicationDependency (uses: Application M:N Package) =====
CREATE TABLE application_dependency (
  app_id     INT NOT NULL REFERENCES application(app_id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES package(package_id) ON DELETE CASCADE,
  PRIMARY KEY (app_id, package_id)
);

-- ===== Dependency (parent/child: Package self-referencing M:N) =====
CREATE TABLE dependency (
  parent_package_id INT NOT NULL REFERENCES package(package_id) ON DELETE CASCADE,
  child_package_id  INT NOT NULL REFERENCES package(package_id) ON DELETE CASCADE,
  dep_type          TEXT NOT NULL DEFAULT 'runtime',
  PRIMARY KEY (parent_package_id, child_package_id),
  CHECK (parent_package_id <> child_package_id)
);

-- ===== Vulnerability (sourced from OSV.dev) =====
CREATE TABLE vulnerability (
  vuln_id  SERIAL PRIMARY KEY,
  osv_id   TEXT NOT NULL UNIQUE,
  severity TEXT,
  summary  TEXT
);

-- ===== AffectedRange (has ranges) =====
CREATE TABLE affected_range (
  range_id     SERIAL PRIMARY KEY,
  vuln_id      INT NOT NULL REFERENCES vulnerability(vuln_id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  introduced   TEXT,
  fixed        TEXT
);

-- ===== VulnerabilityFlag (flagged / has flags / flagged_by) =====
CREATE TABLE vulnerability_flag (
  flag_id    SERIAL PRIMARY KEY,
  package_id INT NOT NULL REFERENCES package(package_id) ON DELETE CASCADE,
  vuln_id    INT NOT NULL REFERENCES vulnerability(vuln_id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  flagged_by INT NOT NULL REFERENCES app_user(user_id),
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, vuln_id)
);

-- ===== ImpactReport (produces, 1:1 with flag) =====
CREATE TABLE impact_report (
  report_id             SERIAL PRIMARY KEY,
  flag_id               INT NOT NULL UNIQUE REFERENCES vulnerability_flag(flag_id) ON DELETE CASCADE,
  affected_package_count INT NOT NULL DEFAULT 0,
  affected_app_count     INT NOT NULL DEFAULT 0,
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Indexing =====
CREATE INDEX idx_dependency_parent ON dependency(parent_package_id);
CREATE INDEX idx_dependency_child ON dependency(child_package_id);

-- ===== Recursive CTE functions =====

-- Explosion: everything package p_package_id pulls in, transitively.
CREATE OR REPLACE FUNCTION explode_dependencies(p_package_id INT)
RETURNS TABLE(package_id INT, name TEXT, version TEXT, depth INT) AS $$
  WITH RECURSIVE tree AS (
    SELECT d.child_package_id AS package_id, 1 AS depth,
           ARRAY[p_package_id, d.child_package_id] AS path
    FROM dependency d
    WHERE d.parent_package_id = p_package_id

    UNION ALL

    SELECT d.child_package_id, t.depth + 1, t.path || d.child_package_id
    FROM dependency d
    JOIN tree t ON d.parent_package_id = t.package_id
    WHERE NOT d.child_package_id = ANY(t.path)
  )
  SELECT t.package_id, p.name, p.version, MIN(t.depth) AS depth
  FROM tree t
  JOIN package p ON p.package_id = t.package_id
  GROUP BY t.package_id, p.name, p.version
  ORDER BY depth, p.name;
$$ LANGUAGE sql STABLE;

-- Implosion: everything that transitively depends on p_package_id.
CREATE OR REPLACE FUNCTION implode_impact(p_package_id INT)
RETURNS TABLE(package_id INT, name TEXT, version TEXT, depth INT) AS $$
  WITH RECURSIVE tree AS (
    SELECT d.parent_package_id AS package_id, 1 AS depth,
           ARRAY[p_package_id, d.parent_package_id] AS path
    FROM dependency d
    WHERE d.child_package_id = p_package_id

    UNION ALL

    SELECT d.parent_package_id, t.depth + 1, t.path || d.parent_package_id
    FROM dependency d
    JOIN tree t ON d.child_package_id = t.package_id
    WHERE NOT d.parent_package_id = ANY(t.path)
  )
  SELECT t.package_id, p.name, p.version, MIN(t.depth) AS depth
  FROM tree t
  JOIN package p ON p.package_id = t.package_id
  GROUP BY t.package_id, p.name, p.version
  ORDER BY depth, p.name;
$$ LANGUAGE sql STABLE;

-- ===== Trigger: block direct + transitive self-dependency (cycle guard) =====
CREATE OR REPLACE FUNCTION prevent_dependency_cycle() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_package_id = NEW.child_package_id THEN
    RAISE EXCEPTION 'Package % cannot depend on itself', NEW.parent_package_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM explode_dependencies(NEW.child_package_id) e
    WHERE e.package_id = NEW.parent_package_id
  ) THEN
    RAISE EXCEPTION 'Dependency % -> % would create a cycle', NEW.parent_package_id, NEW.child_package_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_cycle
BEFORE INSERT OR UPDATE ON dependency
FOR EACH ROW EXECUTE FUNCTION prevent_dependency_cycle();

-- ===== Trigger: auto-recompute affected-package / affected-app counts on ImpactReport =====
CREATE OR REPLACE FUNCTION recompute_impact_counts() RETURNS TRIGGER AS $$
DECLARE
  v_package_id INT;
BEGIN
  SELECT package_id INTO v_package_id FROM vulnerability_flag WHERE flag_id = NEW.flag_id;

  SELECT count(*) INTO NEW.affected_package_count
  FROM implode_impact(v_package_id);

  SELECT count(DISTINCT ad.app_id) INTO NEW.affected_app_count
  FROM application_dependency ad
  WHERE ad.package_id IN (
    SELECT package_id FROM implode_impact(v_package_id)
    UNION
    SELECT v_package_id
  );

  NEW.generated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_impact
BEFORE INSERT OR UPDATE ON impact_report
FOR EACH ROW EXECUTE FUNCTION recompute_impact_counts();
