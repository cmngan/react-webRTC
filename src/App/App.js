import { useState, useEffect, useRef } from 'react'
import './App.css'
import 'webrtc-adapter'

const servers = null
const pcConstraint = null
const dataConstraint = null

const isDebug = true

const log = {
  debug: (...str) => {
    if (isDebug) console.log(...str)
  },
  info: (...str) => {
    console.log(...str)
  },
  error: (...str) => {
    console.error(...str)
  },
}

const useRtc = (channelName = 'awesome-cm') => {
  const conn = useRef(null)
  const sendChannel = useRef(null)
  const receiveChannel = useRef(null)
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  function onStart() {
    conn.current = new RTCPeerConnection(servers, pcConstraint)
    sendChannel.current = conn.current.createDataChannel(channelName, dataConstraint)
    conn.current.ondatachannel = onDataChannel
    conn.current.onicecandidate = onIceCandidate

    async function onDataChannel(event) {
      log.debug('onDataChannel', event)
      receiveChannel.current = event.channel
      receiveChannel.current.onmessage = evt => setMessage(evt.data)
      receiveChannel.current.onopen = () => log.info('receiveChannel open')
      receiveChannel.current.onclose = () => log.info('receiveChannel close')
    }

    async function onIceCandidate(event) {
      const desc = event.currentTarget.localDescription
      if (desc) {
        log.debug('onIceCandidate', desc)
        setDescription(JSON.stringify(desc))
      }
    }
  }

  function onClose() {
    sendChannel.current.close()
    sendChannel.current = null
    receiveChannel.current.close()
    receiveChannel.current = null
    conn.current.close()
    conn.current = null
    setDescription('')
    setMessage('')
  }

  async function createOffer() {
    try {
      const desc = await conn.current.createOffer()
      conn.current.setLocalDescription(desc)
      log.debug('Offer Connection \n' + desc.sdp)
    } catch (error) {
      log.error(error)
    }
  }

  async function createAnswer() {
    try {
      const desc = await conn.current.createAnswer()
      conn.current.setLocalDescription(desc)
      log.debug('Answer Connection \n' + desc.sdp)
    } catch (error) {
      log.error(error)
    }
  }

  function acceptOffer(remoteDesc) {
    conn.current.setRemoteDescription(JSON.parse(remoteDesc))
  }

  async function remoteResponse(remoteDesc) {
    acceptOffer(remoteDesc)
    await createAnswer()
  }

  function sendData(value) {
    sendChannel.current.send(value)
    log.debug('Sent Data: ' + value)
    // Set local
    // setMessage(value)
  }

  return {
    onStart,
    conn,
    description,
    message,
    createOffer,
    acceptOffer,
    remoteResponse,
    sendData,
    onClose,
  }
}

function App() {
  const { onStart, onClose, description, message, createOffer, acceptOffer, remoteResponse, sendData } = useRtc()
  const [isLocal, setIsLocal] = useState(null)
  const [remoteDescription, setRemoteDescription] = useState('')

  useEffect(() => {
    onStart()
    return () => onClose
    // eslint-disable-next-line
  }, [])

  if (isLocal === null)
    return (
      <div className="App">
        <button onClick={() => setIsLocal(true)}>Host/Local</button>
        <button onClick={() => setIsLocal(false)}>Guest/remote</button>
      </div>
    )

  return (
    <div className="App">
      {isLocal ? (
        <>
          <h2>Host/Local</h2>
          <button className="a" onClick={createOffer}>
            1. Create local Offer
          </button>
        </>
      ) : (
        <>
          <h2>Guest/remote</h2>
          <p>4. Copy remote offer</p>
        </>
      )}

      <textarea className="output" value={description} readOnly />

      <p>{isLocal ? '5. Paste remote offer below' : '2. Copy host offer to below'}</p>
      <textarea className="output" value={remoteDescription} onChange={e => setRemoteDescription(e.target.value)} />
      {isLocal ? (
        <button className="a" onClick={() => acceptOffer(remoteDescription)}>
          6. Accept Offer
        </button>
      ) : (
        <button className="a" onClick={() => remoteResponse(remoteDescription)}>
          3. Remote Response
        </button>
      )}

      <h2>7. Interaction</h2>
      <textarea className="output" value={message} onChange={e => sendData(e.target.value)}></textarea>
    </div>
  )
}

export default App
