import { createContext, useState, useCallback, useEffect, startTransition } from "react";
import { useAuth, useUser, useClerk} from "@clerk/react"
import axios from "axios"
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";


export const AppContext = createContext();

const formatBackendError = (message) => {
  if (!message) {
    return "Something went wrong. Please try again.";
  }

  if (
    message.includes("MongoDB Atlas") ||
    message.includes("tlsv1 alert internal error") ||
    message.includes("ssl3_read_bytes")
  ) {
    return "Database connection failed. Add this machine to your MongoDB Atlas IP Access List, then restart the backend.";
  }

  return message;
};

const AppContextProvider = ({ children }) => {

  const [credit, setCredit] = useState("Loading...")
  const [image, setImage] = useState(false)
  const [resultImage, setResultImage] = useState(false)
  const [isRemovingBg, setIsRemovingBg] = useState(false)
  const [removeBgError, setRemoveBgError] = useState("")

  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const navigate = useNavigate()

  const { getToken } = useAuth()
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()

  const loadCreditsData = useCallback(async () => {
    try {
        const token = await getToken()
        const {data} = await axios.get(backendUrl+"/api/user/credits", {headers: {token}})
        if (data.success) {
            setCredit(data.credits)
            console.log("Credits loaded:", data.credits)
        } else {
            const message = formatBackendError(data.message)
            console.error("Backend returned error:", message)
            toast.error(message)
            setCredit("Error")
        }
    } catch (error) {
      console.error(error);
      toast.error(formatBackendError(error.response?.data?.message || error.message))
      return null;
    }
  }, [getToken, backendUrl]);

  useEffect(() => {
    if (isSignedIn) {
      loadCreditsData()
    }
  }, [isSignedIn, loadCreditsData])

  const removeBg = async (image) => {
    try{
      if (!image) {
        return;
      }

      if (!isSignedIn){
        return openSignIn()
      }

      if (credit === 0) {
        navigate('/buy')
        return;
      }

      setImage(image)
      setResultImage(false)
      setRemoveBgError("")
      setIsRemovingBg(true)
      startTransition(() => {
        navigate('/result')
      })

      const token = await getToken()

      const formData = new FormData()
      image && formData.append('image', image)

      const { data } = await axios.post(backendUrl + '/api/image/remove-bg', formData, { 
        headers: { 
          token,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      })

      if (data.success) {
        setResultImage(data.resultImage)
        if (typeof data.creditBalance === "number") {
          setCredit(data.creditBalance)
        }
      } else {
        const message = formatBackendError(data.message || "Background removal failed")
        setRemoveBgError(message)
        toast.error(message)
        if (typeof data.creditBalance === "number") {
          setCredit(data.creditBalance)
        }
        
        if (data.creditBalance === 0){
          startTransition(() => {
            navigate('/buy')
          })
        }
      }

    } catch(error){
      console.log(error)
      const message = formatBackendError(error.response?.data?.message || error.message || "Background removal failed")
      setRemoveBgError(message)
      toast.error(message)
    } finally {
      setIsRemovingBg(false)
    }
  }

  const value = {
    backendUrl,
    credit,
    setCredit,
    loadCreditsData,
    image,
    setImage,
    removeBg,
    resultImage,
    setResultImage,
    isRemovingBg,
    removeBgError
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
