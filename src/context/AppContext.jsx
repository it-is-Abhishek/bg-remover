import { createContext, useState, useCallback, useEffect } from "react";
import { useAuth, useUser, useClerk} from "@clerk/react"
import axios from "axios"
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";


export const AppContext = createContext();

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
            console.error("Backend returned error:", data.message)
            toast.error(data.message || "Failed to load credits")
            setCredit("Error")
        }
    } catch (error) {
      console.error(error);
      toast.error(error.message)
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

      setImage(image)
      setResultImage(false)
      setRemoveBgError("")
      setIsRemovingBg(true)
      navigate('/result')

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
        data.creditBalance && setCredit(data.creditBalance)
      } else {
        setRemoveBgError(data.message || "Background removal failed")
        toast.error(data.message)
        data.creditBalance && setCredit(data.creditBalance)
        
        if (data.creditBalance === 0){
          navigate('/buy')
        }
      }

    } catch(error){
      console.log(error)
      const message = error.response?.data?.message || error.message || "Background removal failed"
      setRemoveBgError(message)
      toast.error(message)
    } finally {
      setIsRemovingBg(false)
    }
  }

  const value = {
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
