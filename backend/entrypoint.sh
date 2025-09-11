#!/bin/sh


echo "Waiting for database..."

until pg_isready -h db -p 5432 -U "$DB_USER"; do
  sleep 1
done

echo "Database is up!"

alembic upgrade head

cd ./src

uvicorn main:app --host 0.0.0.0 --port 8000 --reload