import { useParams } from "react-router-dom";

export default function DogProfile() {
  const { id } = useParams();

  return (
    <div style={{ padding: "30px" }}>
      <h1>Dog Profile</h1>
      <p>Dog ID: {id}</p>
    </div>
  );
}