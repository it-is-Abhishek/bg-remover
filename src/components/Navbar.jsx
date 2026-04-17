import React from 'react'
import { assets } from "../assets/assets"
import { Link } from 'react-router-dom'
import { UserButton, useClerk, useUser } from '@clerk/react'

const Navbar = () => {
  const { openSignIn } = useClerk()
  const { isSignedIn } = useUser()

  return (
    <div className="flex items-center justify-between mx-4 py-3 lg:mx-44">
      <Link to = "/"><img className="w-32 sm:w-44" src={assets.logo} alt="Logo" /></Link>
      {isSignedIn ? (
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-10 h-10 rounded-full",
              userButtonTrigger: "focus:shadow-none"
            }
          }}
        />
      ) : (
        <button onClick={() => openSignIn({})} className='bg-zinc-800 text-white flex items-center gap-4 px-4 py-2 sm:py-3 rounded-full'>
          Get Started <img className="w-3 sm:w-4" src={assets.arrow_icon} alt="" />
        </button>
      )}
    </div>
  )
}

export default Navbar
