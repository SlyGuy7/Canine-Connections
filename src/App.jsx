function Milestone2_Frontend() {
  return (
    <div style={{ padding: "35px", fontFamily: "Times New Roman" }}>
      <h1>Canine Connections</h1>
      <p>Find the next great addition to your family!</p>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div style={{ border: "1px solid #ccc", padding: "15px", width: "200px" }}>
          <h3>Name: Candy</h3>
          <p>Breed: Golden Retriever</p>
          <p>Age: 2 years old</p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "15px", width: "200px" }}>
          <h3>Name: Max</h3>
          <p>Breed: German Shepherd</p>
          <p>Age: 4 year old</p>
        </div>

        <div style={{ border: "1px solid #ccc", padding: "15px", width: "200px" }}>
          <h3>Name: Daisy</h3>
          <p>Breed: Boxer</p>
          <p>Age: 10 months old</p>
        </div>
       </div>
      </div>
)
}
	function App() {
        return (
	<div>
	<Milestone2_Frontend />
	</div>
)
}

export default App
