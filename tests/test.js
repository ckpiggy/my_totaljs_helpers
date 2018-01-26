
TEST('get module', ()=>{
  const mongoSchema = MODULE('MongoHelper')
  OK(mongoSchema, 'got module')
})