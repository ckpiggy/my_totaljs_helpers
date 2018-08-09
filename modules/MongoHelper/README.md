# Mongodb helper #

The module can help you to connect to database and:  

- add a global variable "ObjectId"

- attach F.MongoDB as Mongodb.Cliennt.DB

## dependency ##

the module require these dependencies:

[mongodb](https://www.npmjs.com/package/mongodb)

please install before use.

## configuration ##

add `F.wait('mongodb')` to wait for db connection

in total.js config file add

`module#MongoHelper (Object): {url:'mongodb://db_account:db_pwd@your_db_url/the_db', poolSize: 100}`

- url: mongodb url

- poolSize: connection poolSize
