# Mongodb helper #

This module is used to integrate mongodb into [total.js](https://github.com/totaljs/framework) framework.

The module is majorly for helping user to create pagination query/aggregate.

The query object must in this structure

```
{
    sort: ["keyA:1", "keyB:1", "keyC:-1", ....],
    project: ["someKey:1", "anotherKey:1", ....],
    page: "1",
    per_page: "10",
    queryKeyA: valueA,
    queryKeyB: valueB,
    .
    .
    .
}
```

## dependency ##

the module require these dependencies:

[mongodb](https://www.npmjs.com/package/mongodb),

please install before use.

## configuration ##

in total.js config file add

`module#MongoHelper (Object): {url:'mongodb://db_account:db_pwd@your_db_url/the_db'}`


