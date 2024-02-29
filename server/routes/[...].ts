export default eventHandler(() => {
  console.log("🔥 catch all endpoint hit");
  return { status: "I'm Alive 🏝️" };
});
