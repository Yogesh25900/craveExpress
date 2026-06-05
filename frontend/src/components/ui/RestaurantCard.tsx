"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, Clock, Bike, MapPin } from "lucide-react";
import { useFavourites } from "@/context/FavouritesContext";
import { formatDistance } from "@/lib/geo";

interface RestaurantCardProps {
  id?: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  isFree?: boolean;
  isOpen?: boolean;
  tags?: string[];
  distance?: number; // km from user — shown when location is available
}

export default function RestaurantCard({
  id, name, image, cuisine, rating, deliveryTime, deliveryFee, isFree, isOpen = true, tags = [], distance,
}: RestaurantCardProps) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const liked = id ? isFavourite(id) : false;

  const card = (
    <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 ${!isOpen ? "opacity-70" : ""}`}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={name}
          fill
          className={`object-cover transition-transform duration-500 ${isOpen ? "group-hover:scale-105" : ""}`}
        />
        {/* Closed overlay */}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
              Currently Closed
            </span>
          </div>
        )}
        {/* Tags */}
        {tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] font-bold bg-[#ff6b35] text-white px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Favourite */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (id) toggleFavourite(id); }}
          aria-label={liked ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
          className="absolute top-3 right-3 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-[15px] leading-tight line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-gray-800">{rating}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-3 line-clamp-1">{cuisine}</p>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{deliveryTime}</span>
          </div>
          <div className={`flex items-center gap-1 font-medium ${isFree ? "text-green-600" : "text-gray-500"}`}>
            <Bike className="w-3.5 h-3.5" />
            <span>{isFree ? "Free" : `${deliveryFee} Fee`}</span>
          </div>
        </div>
        {distance !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{formatDistance(distance)} away</span>
          </div>
        )}
      </div>
    </div>
  );

  if (id && isOpen) {
    return <Link href={`/restaurants/${id}`} aria-label={`View ${name} restaurant`}>{card}</Link>;
  }
  return card;
}
