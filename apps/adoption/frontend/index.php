
<!DOCTYPE html>
<html>
<body>

<h1>Frontend Running</h1> //heading to show that frontend is running

<button onclick="fetchBackend()">Call Backend</button> //this button calls the javascript function

<script>
function fetchBackend() { //function that runs when button is clicked
	fetch('http://localhost:8000') //this sends a request to a php backend running on localhost port 8000
		.then(r => r.text()) //convert it to plain text
		.then(t => alert(t));//display everthing the backend returns as a popup alert
}
</script>

</body>
</html>


