docker run \
  --name oracle19c \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PDB=ORCLPDB1 \
  -e ORACLE_PWD=Oracle123 \
  -e INIT_SGA_SIZE=3000 \
  -e INIT_PGA_SIZE=1000 \
  -v ~/oracle-data:/opt/oracle/oradata \
  -d \
  oracle/database:19.3.0-ee


  