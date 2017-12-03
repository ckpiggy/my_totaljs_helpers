
TEST('get module', ()=>{
  const mongoSchema = MODULE('MongoHelper')
  console.log(mongoSchema)
  OK(mongoSchema, 'got module')
})