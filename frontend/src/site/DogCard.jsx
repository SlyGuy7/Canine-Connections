import React from "react"
import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { ageGroup, formatEnum } from "../utils/format"

export default function DogCard({ dog }) {
  const photo = dog.image || (typeof dog.photos === "string" ? dog.photos.split(",")[0].trim() : null)
  return (
    <Link to={`/dogs/${dog.dog_id}`} className="s-card s-dog">
      <div className="s-dog__photo">
        {photo && <img src={photo} alt={`${dog.name}, a ${dog.breed}`} loading="lazy" />}
      </div>
      <div className="s-card__body">
        <span className="s-dog__name">{dog.name}</span>
        <span className="s-dog__breed">{dog.breed}</span>
        <div className="s-dog__meta">
          <span className="s-chip">{ageGroup(dog.age_years)}</span>
          {dog.size && <span className="s-chip">{formatEnum(dog.size)}</span>}
          {dog.gender && <span className="s-chip">{formatEnum(dog.gender)}</span>}
        </div>
        {dog.shelter_name && (
          <span className="s-dog__place"><MapPin size={14} /> {dog.shelter_name}</span>
        )}
      </div>
    </Link>
  )
}

export function DogCardSkeleton() {
  return (
    <div className="s-card" aria-hidden="true">
      <div className="s-dog__photo s-skeleton" />
      <div className="s-card__body">
        <div className="s-skeleton" style={{ height: 20, width: "55%", borderRadius: 6 }} />
        <div className="s-skeleton" style={{ height: 14, width: "40%", borderRadius: 6 }} />
      </div>
    </div>
  )
}
