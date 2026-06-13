#!/bin/bash
DB_PASS="DB_PASS_$(openssl rand -hex 12)"
JWT="$(openssl rand -base64 32)"
ssh mstarman@192.168.100.89 "sudo sed -i \"s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASS|\" /opt/supabase/docker/.env && sudo sed -i \"s|JWT_SECRET=.*|JWT_SECRET=$JWT|\" /opt/supabase/docker/.env && sudo sed -i \"s|SITE_URL=.*|SITE_URL=http://100.107.103.110:8000|\" /opt/supabase/docker/.env"
echo "Done"
