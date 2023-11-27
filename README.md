# Electric SQL and SolidJS

# The Frontedn
To run:
```
git clone ...
cd ...
npm i
npm run dev
```

## The Backend
You only need to start the backend if you are trying to write directly to the sql dtabase, or you want to sync data between instances.

You will need docker-compose v2, your distro might only have v1 in its repo, so check before installing.
```
cd backend
docker compose up
```

## Modifying
If you want to change the application you will need to define your own database. You can create a new postgres instance and create your own tables and electrify them using `ALTER TABLE my_table ENABLE ELECTRIC;` note that this will only work if the table has a uuid as a primary key.

After your databse is set up you need to generate the typescript client bindings using:
``````
