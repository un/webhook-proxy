export default eventHandler((event) => {
  return send(event, "ok", "application/text");
});
