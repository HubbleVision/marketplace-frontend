'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect, useChains } from 'wagmi'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { createWalletClient, custom, type Address } from 'viem'
import { useMutation } from '@tanstack/react-query'
import { useSession, TOKEN_KEY } from '~/components/session'
import {
  createChallengeApiV1AuthChallengePostMutation,
  loginApiV1AuthLoginPostMutation
} from '@openapi/@tanstack/react-query.gen'
import { toastError, toastSuccess } from '~/lib/utils'
import { Loader2, LogOut, LayoutDashboard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import ProfileIcon from '~/svg/profile'
import Wallet from '~/svg/wallet'
import { useDevice } from '~/hooks/useDevice'

// Base Sepolia chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532

/**
 * Wrapper component to check if WagmiProvider is available
 * Detects by attempting to render a component that uses wagmi hooks
 */
function WagmiProviderGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Use polling to check if WagmiProvider is available
    // Check if there are wagmi-related global variables on the window object
    const checkWagmi = () => {
      // Try to access React DevTools or check DOM
      // More reliable method: wait for a short delay to let Web3Provider render
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 200) // Give enough time for Web3Provider's mounted state to update
      return () => clearTimeout(timer)
    }

    const timer = checkWagmi()
    return () => clearTimeout(timer as any)
  }, [])

  if (!isReady) {
    return <Loader2 className="h-4 w-4 animate-spin text-white" />
  }

  return <>{children}</>
}

export default function WalletConnectButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state before mounted
  if (!mounted) {
    return <Loader2 className="h-4 w-4 animate-spin text-white" />
  }

  // Use WagmiProviderGuard to ensure WagmiProvider is available before rendering content
  return (
    <WagmiProviderGuard>
      <WalletConnectButtonContent />
    </WagmiProviderGuard>
  )
}

function WalletConnectButtonContent() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { session, setSession, userProfile, pending } = useSession()
  const { small } = useDevice()
  const navigate = useNavigate()
  const chains = useChains()
  const prevAddressRef = useRef<Address | undefined>(undefined)
  const isAuthenticatingRef = useRef(false)
  const hasTriedAuthRef = useRef(false) // Track whether authentication has been attempted (for refresh scenarios)

  // Check if current chain is supported
  const isChainSupported = chainId ? chains.some((chain) => chain.id === chainId) : false

  // Listen for chain changes, show prompt if switching to unsupported network
  useEffect(() => {
    if (isConnected && chainId && !isChainSupported) {
      toastError(`Unsupported network detected. Please switch to one of: ${chains.map((c) => c.name).join(', ')}`)
    }
  }, [chainId, isConnected, isChainSupported, chains])

  const challengeMutation = useMutation(
    createChallengeApiV1AuthChallengePostMutation()
  )
  const loginMutation = useMutation(loginApiV1AuthLoginPostMutation())

  const isAuthenticating = challengeMutation.isPending || loginMutation.isPending

  // Backend authentication logic
  const authenticateWallet = async (walletAddress: Address) => {
    if (isAuthenticatingRef.current || session) {
      return
    }

    try {
      isAuthenticatingRef.current = true

      // Check if on the correct chain
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        toastError('Please switch to Base Sepolia network')
        return
      }

      // Get provider
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No ethereum provider found')
      }

      // 1. Get challenge
      const challengeResponse = await challengeMutation.mutateAsync({
        body: {
          wallet_address: walletAddress,
          chain_id: BASE_SEPOLIA_CHAIN_ID,
        },
      })

      if (!challengeResponse.message) {
        throw new Error('Failed to get challenge')
      }

      // 2. Sign message
      const walletClient = createWalletClient({
        account: walletAddress,
        transport: custom(window.ethereum),
      })

      const signature = await walletClient.signMessage({
        message: challengeResponse.message,
      })

      // 3. Login
      const loginResponse = await loginMutation.mutateAsync({
        body: {
          wallet_address: walletAddress,
          chain_id: BASE_SEPOLIA_CHAIN_ID,
          signature: signature,
          nonce: challengeResponse.nonce,
        },
      })

      // 4. Save token
      if (loginResponse.access_token) {
        window.localStorage.setItem(TOKEN_KEY, loginResponse.access_token)
        setSession(true)
        toastSuccess('Login successfully')
      } else {
        throw new Error('No access token received')
      }
    } catch (error: any) {
      console.error('Wallet authentication failed:', error)
      toastError(error?.message || 'Authentication failed')
    } finally {
      isAuthenticatingRef.current = false
    }
  }

  // Listen for account changes
  useEffect(() => {
    // If session verification is still in progress, wait for it to complete
    if (pending) {
      return
    }

    // If already logged in, update ref and reset authentication attempt flag
    if (session) {
      prevAddressRef.current = address
      hasTriedAuthRef.current = false
      return
    }

    // If wallet is connected and has address, and not authenticating
    if (isConnected && address && !isAuthenticatingRef.current) {
      // If address changes (from none to having one, or switching accounts), trigger authentication
      if (address !== prevAddressRef.current) {
        prevAddressRef.current = address
        hasTriedAuthRef.current = false // Reset flag when address changes
        // Delay a bit to ensure chain switch completes
        const timer = setTimeout(() => {
          authenticateWallet(address)
        }, 500)
        return () => clearTimeout(timer)
      }
      // If address hasn't changed but session is invalid, and haven't tried authentication yet, might be after refresh
      else if (!hasTriedAuthRef.current) {
        hasTriedAuthRef.current = true
        prevAddressRef.current = address
        // Delay a bit to ensure chain switch completes
        const timer = setTimeout(() => {
          authenticateWallet(address)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [address, isConnected, session, pending])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY)
    }
    disconnect()
    setSession(false)
    hasTriedAuthRef.current = false // Reset authentication attempt flag on logout
    prevAddressRef.current = undefined // Reset address reference
    toastSuccess('Logout successfully')
  }

  // Format wallet address display (truncate)
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address
    return `${address.slice(0, 5)}...${address.slice(-5)}`
  }

  // Determine login method
  const isEmailLogin = userProfile?.email != null
  const userIdentifier = isEmailLogin
    ? userProfile?.email
    : userProfile?.wallet_address
      ? formatWalletAddress(userProfile.wallet_address)
      : ''

  // If logged in, show user avatar and dropdown menu
  // But if chain is not supported, prioritize showing chain error prompt
  if (session && userProfile) {
    // If wallet is connected but chain is not supported, show error prompt
    if (isConnected && chainId && !isChainSupported) {
      return (
        <ConnectButton.Custom>
          {({ openChainModal, mounted }) => {
            if (!mounted) {
              return <Loader2 className="h-4 w-4 animate-spin text-white" />
            }
            return (
              <button
                onClick={openChainModal}
                type="button"
                className="px-6 py-2 text-sm bg-red-500 rounded-lg text-white cursor-pointer hover:bg-red-600"
              >
                Wrong network
              </button>
            )
          }}
        </ConnectButton.Custom>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center cursor-pointer">
            <ProfileIcon className="h-6 w-6 text-orange-300" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-hubble-background-secondary border-hubble-border min-w-[200px] p-3 rounded-lg"
          align="end"
        >
          <div className="py-4">
            <div className="rounded-lg p-0">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <ProfileIcon className="h-6 w-6 text-orange-300" />
                </div>
                <div className="w-full border border-[#ffffff50] rounded px-3 py-2 text-[#B8B8B8] text-xs text-center">
                  {userIdentifier}
                </div>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator className="bg-[#ffffff20]" />
          <DropdownMenuItem
            className="text-white hover:bg-hubble-background focus:bg-hubble-background cursor-pointer px-4 py-3"
            onClick={() => {
              navigate('/me/agents')
            }}
          >
            <LayoutDashboard className="h-4 w-4 mr-2 text-white" />
            <span className="text-white">My Data Lab</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#ffffff20]" />
          <DropdownMenuItem
            className="text-white hover:bg-hubble-background focus:bg-hubble-background cursor-pointer px-4 py-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2 text-white" />
            <span className="text-white">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // If loading or authenticating
  if (pending || isAuthenticating) {
    return <Loader2 className="h-4 w-4 animate-spin text-white" />
  }

  // Not logged in: show RainbowKit ConnectButton
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // If chain error (use manual check, more reliable)
              const currentChainSupported = chain?.id ? chains.some((c) => c.id === chain.id) : true
              if (connected && (!currentChainSupported || chain?.unsupported)) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-6 py-2 text-sm bg-red-500 rounded-lg text-white cursor-pointer hover:bg-red-600"
                  >
                    Wrong network
                  </button>
                )
              }

              // If wallet is connected but session is invalid, show re-authentication button
              if (connected && !session && account?.address) {
                const walletAddress = account.address as Address
                if (small) {
                  return (
                    <div
                      className="w-8 h-8 rounded-full bg-hubble-primary hover:bg-hubble-primary/80 transition-colors flex items-center justify-center cursor-pointer"
                      onClick={() => {
                        if (!isAuthenticatingRef.current) {
                          authenticateWallet(walletAddress)
                        }
                      }}
                    >
                      <Wallet className="text-black" />
                    </div>
                  )
                }
                return (
                  <button
                    onClick={() => {
                      if (!isAuthenticatingRef.current) {
                        authenticateWallet(walletAddress)
                      }
                    }}
                    type="button"
                    disabled={isAuthenticatingRef.current}
                    className="px-6 py-2 text-sm bg-hubble-primary rounded-lg text-black cursor-pointer hover:bg-hubble-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthenticatingRef.current ? 'Authenticating...' : 'Re-authenticate'}
                  </button>
                )
              }

              // Show connect button
              if (small) {
                return (
                  <div
                    className="w-8 h-8 rounded-full bg-hubble-primary hover:bg-hubble-primary/80 transition-colors flex items-center justify-center cursor-pointer"
                    onClick={openConnectModal}
                  >
                    <Wallet className="text-black" />
                  </div>
                )
              }

              return (
                <button
                  onClick={openConnectModal}
                  type="button"
                  className="px-6 py-2 text-sm bg-hubble-primary rounded-lg text-black cursor-pointer hover:bg-hubble-primary/80"
                >
                  Connect Wallet
                </button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
