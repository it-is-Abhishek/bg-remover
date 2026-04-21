import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from "../context/AppContext"

const buildPreviewUrl = async (file) => {
  if (!file) {
    return null
  }

  try {
    const bitmap = await createImageBitmap(file)
    const maxDimension = 1400
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return URL.createObjectURL(file)
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const previewBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    return previewBlob ? URL.createObjectURL(previewBlob) : URL.createObjectURL(file)
  } catch {
    return URL.createObjectURL(file)
  }
}

const Result = () => {

    const { resultImage, image, isRemovingBg, removeBgError, setImage, setResultImage } = useContext(AppContext)
    const [previewUrl, setPreviewUrl] = useState(null)

    useEffect(() => {
      let isActive = true
      let nextUrl = null

      if (!image) {
        setPreviewUrl(null)
        return
      }

      ;(async () => {
        nextUrl = await buildPreviewUrl(image)
        if (isActive) {
          setPreviewUrl(nextUrl)
        } else if (nextUrl) {
          URL.revokeObjectURL(nextUrl)
        }
      })()

      return () => {
        isActive = false
        if (nextUrl) {
          URL.revokeObjectURL(nextUrl)
        }
      }
    }, [image])


  return (
    <div className='max-4 my-3 lg:mx-44 mt-14 min-h-[75vh]'>

      <div className='bg-white rounded-lg px-8 py-6 drop-shadow'>


        {/* ---------------- Image COntainer ----------------- */}

        <div className='flex flex-col sm:grid grid-cols-2 gap-8'>
                {/* -------------- Left Side ----------------  */}

                <div>
                  <p className='font-semibold text-gray-600 mb-2' >Original</p>
                  {previewUrl ? (
                    <img className="rounded-md border" src={previewUrl} alt="Original upload" />
                  ) : (
                    <div className='rounded-md border min-h-60 bg-gray-50'></div>
                  )}
                </div>



                {/* ---------------- Right Side --------------- */}
                <div className='flex flex-col'>

                  <p className='font-semibold text-gray-600 mb-2' >Background Removed</p>
                  <div className='rounded-md border border-gray-300 h-full relative bg-layer overflow-hidden'>
                    {resultImage ? <img src={resultImage} alt="Background removed result" /> : null}
                    {isRemovingBg && image && (
                      <div className='absolute right-1/2 bottom-1/2 transform translate-x-1/2 translate-y-1/2 '>
                      <div className='border-4 border-black-600 rounded-full h-12 w-12 border-t-transparent animate-spin'></div>
                    </div>
                    )}

                    {!isRemovingBg && !resultImage && image && (
                      <div className='absolute inset-0 flex items-center justify-center bg-white/80 px-6 text-center text-sm text-gray-600'>
                        {removeBgError || 'Unable to remove the background for this image.'}
                      </div>
                    )}
                    
                  </div>
                </div>
              </div>
              {/* ------------------- Buttons ----------------- */}

              {resultImage && <div className='flex justify-center sm:justify-end items-center flex-wrap gap-4 mt-6'>
                  <button
                    onClick={() => {
                      setImage(false)
                      setResultImage(false)
                    }}
                    className='px-8 py-2.5 text-violet-600 text-sm border border-violet-600 rounded-full hover:scale-105 transition-all duration-700'
                  >
                    Try Another image
                  </button>
                  <a href={resultImage} download className="px-8 py-2.5 text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full hover:scale-105 transition-all duration-700">Download Image</a>
              </div>}
      </div >
    </div>
  )
}

export default Result;
