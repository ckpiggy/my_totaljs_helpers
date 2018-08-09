const F = global.framework
const Promise = global.Promise

if (F.isTest) {
  F.on('exit', async () => {
    try {
      const cols = await F.MongoDB.collections()
      if (cols) {
        const drops = cols.map(col => col.drop())
        await Promise.all(drops)
      }
    } catch (e) {
      console.error(e)
    }
  })
}

