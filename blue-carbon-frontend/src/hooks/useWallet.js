import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function useWallet() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const authStore = useAuthStore()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const newProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(newProvider)
    }
  }, [])

  const connect = async () => {
    if (!provider) {
      toast.error('MetaMask not installed. Install from metamask.io')
      return
    }

    try {
      setIsConnecting(true)
      const accounts = await provider.send('eth_requestAccounts', [])
      const newAddress = accounts[0]
      const newSigner = await provider.getSigner()
      setAddress(newAddress)
      setSigner(newSigner)

      // Update backend
      await authAPI.updateWallet(newAddress)
      toast.success(`Wallet connected: ${newAddress.slice(0,6)}...${newAddress.slice(-4)}`)

    } catch (error) {
      if (error.code === 4001) {
        toast.error('Connection rejected')
      } else {
        toast.error('Connection failed')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = async () => {
    setAddress(null)
    setSigner(null)
  }

  return { connect, disconnect, address, signer, provider, isConnecting }
}

