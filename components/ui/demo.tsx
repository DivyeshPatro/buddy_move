"use client"

import { Tiles } from "@/components/ui/tiles"

export function TilesDemo() {
  return (
    <div className="w-full h-[500px]">
      <Tiles 
        rows={50} 
        cols={8}
        tileSize="md"
      />
    </div>
  )
}
