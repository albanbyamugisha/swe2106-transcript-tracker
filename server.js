const app = require('./app');
// Start the demo server on this computer.
const port = Number(process.env.PORT || 3002);
const host = process.env.BIND_HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Transcript Tracker: http://${host}:${port}`))
  .on('error', error => {
    console.error(error.message);
    process.exitCode = 1;
  });
