CREATE DATABASE keycloak_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

GRANT TEMPORARY, CONNECT ON DATABASE keycloak_db TO PUBLIC;

GRANT ALL ON DATABASE keycloak_db TO keycloak;

GRANT ALL ON DATABASE keycloak_db TO postgres;


2TWVB4XzR^FiTdDBaeP$


ENV=prod
KC_DB_PASSWORD=SJEv@3sT$NMq2ijXs4D$
KC_DB_SCHEMA=public
KC_DB_URL_DATABASE=keycloak_db
KC_DB_URL_HOST=prod-aurora-clusterinstance1.cy9g0wlxehkp.us-east-2.rds.amazonaws.com
KC_DB_USERNAME=keycloak
KC_PROXY=edge
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=yea&GvTjm9NF
NO_COLOR=1
SERVICE=keycloak
