import React, { useContext } from 'react'
import { plans, assets} from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BuyCredit = () => {

    const { backendUrl, loadCreditsData } = useContext(AppContext)

    const navigate = useNavigate()

    const { getToken } = useAuth()
    const { user } = useUser()

    const getUserHeaders = () => ({
        'x-user-email': user?.primaryEmailAddress?.emailAddress || '',
        'x-user-first-name': user?.firstName || '',
        'x-user-last-name': user?.lastName || '',
        'x-user-photo': user?.imageUrl || '',
    })

    const loadRazorpayScript = () => {
        if (window.Razorpay) {
            return Promise.resolve(true)
        }

        return new Promise((resolve) => {
            const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')

            if (existingScript) {
                const checkLoaded = () => resolve(Boolean(window.Razorpay))

                window.setTimeout(checkLoaded, 1500)
                existingScript.addEventListener('load', checkLoaded, { once: true })
                existingScript.addEventListener('error', () => resolve(false), { once: true })
                return
            }

            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.async = true
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const initPay = async (order)  => {
        const isScriptLoaded = await loadRazorpayScript()

        if (!isScriptLoaded || !window.Razorpay) {
            toast.error('Razorpay checkout failed to load')
            return
        }

        if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
            toast.error('Razorpay key is missing in frontend env')
            return
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Credits Payment',
            description: "Credits Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {
                console.log(response)
                await loadCreditsData()
                navigate('/')

                const token = await getToken()

                try{

                    const { data } = await axios.post(backendUrl + '/api/user/verify-razor', { headers: { token }})

                    if (data.success){
                        loadCreditsData()
                        navigate("/")
                        toast.success("Credits Added")
                    }

                }catch(error){
                    console.log(error)
                    toast.error(error.message)
                }

            }
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
        
    }

    const paymentRazorPay = async(planId) => {

        try{
            if (!backendUrl) {
                toast.error('Backend URL is missing in frontend configuration')
                return
            }

            const token = await getToken()
            const { data } = await axios.post(backendUrl + '/api/user/pay-razor', {planId}, {headers: {token, ...getUserHeaders()}})
            console.log('pay-razor response', data)
            
            if (data.success) {
                if (!data.order?.id) {
                    toast.error('Razorpay order was not created correctly')
                    return
                }
                await initPay(data.order)
            } else {
                toast.error(data.message || 'Unable to initialize payment')
            }
            
        }catch(error){
            console.log(error)
            toast.error(error.response?.data?.message || error.message)
        }
    }


    
    return(
        <div className='min-h-[80vh] text-center pt-14 mb-10'>
            <button className='border border-gray-400 px-10 py-2 rounded-full mb-6'>Our Plan</button>
            <h1 className = "text-center text-2xl md:text-3xl lg:text-4xl mt-4 font-semibold bg-gradient-to-r from-gray-900 to-gray-400 bg-clip-text text-transparen mb-6 sm:mb-10" >Choose the Plan that's right for you</h1>
            <div className = "flex flex-wrap justify-center gap-6 text-left">
                {plans.map((item, index) => (
                    <div className = "bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-700 hover:scale-105 transition-all duration-500" key = {index}>
                        <img width = {40} src = {assets.logo_icon} alt=''/>
                        <p className = "mt-3 font-semibold">{item.id}</p>
                        <p className = "text-sm">{item.desc}</p>
                        <p className = "mt-6">
                            <span className = "text-3xl font-medium">${item.price}</span> /{item.credits} credits
                        </p>
                        <button onClick={() => paymentRazorPay(item.id)} className = "w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52">Purchase</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default BuyCredit;
