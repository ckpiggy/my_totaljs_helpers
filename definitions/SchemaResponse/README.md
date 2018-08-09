# Schema response #

Add `F.schemaResponse` method to help you to unify schema response (no matter if it has been assigned a controller or not):  

If the SchemaOptions got a **controller** property, it will invoke `$.controller.json()` to send response.
else it will invoke `$.callback` to send response

It is usefull when you want to create a schema to handle both api and internal use.