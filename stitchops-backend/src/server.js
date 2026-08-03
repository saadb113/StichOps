const app = require('./app');

// Safety net: a stray unhandled rejection (e.g. a promise that slipped past
// asyncHandler) should be logged, not take the whole API down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`StitchOps API listening on http://localhost:${port}`);
});
