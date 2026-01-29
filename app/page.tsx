"use client"

import { div } from "framer-motion/client";
import { Mic, Sparkle, CheckCircle, Sparkles, Upload, AudioLines} from "lucide-react";
import { useState, useRef } from "react";


export default function App() {

  const [file, setFile] = useState<File | null>(null)
  const [output, setoutput] = useState<String>("");
  const [loading, setloading] = useState<true | false>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [isRecording, setIsRecording] = useState(false)


  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f);
  }

  
  const startRecording = async () => {
      //the process is like this
      // 1 - get permission
      // 2 - Create a recorder from the microphone
      // 3 - Prepare storage for audio pieces
      // 4 - Collect audio chunks while recording
      // 5 - when stop, Combine all chunks into ONE audio, Turn the Blob into a File and Save it for transcription then Stop the microphone
      try {

        // to get the permission from browser, it will ask user permission when run
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // second step
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          })

          const audioFile = new File([audioBlob], "recording.webm", {
            type: "audio/webm",
          })

          setFile(audioFile);

          await handleTranscribe(audioFile);

          stream.getTracks().forEach((track) => track.stop());
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Mic error:", err)
        alert("Microphone permission denied")
      }
    }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false);
  }


  
  async function handleTranscribe(audioFile?: File) {
    const finalFile = audioFile ?? file;
    if (!finalFile) return

    try {
      setloading(true)

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: await finalFile.arrayBuffer(),
      })

      const data = await res.json()
      setoutput(data.text)
    } catch (err) {
      console.error(err)
      setoutput("Something went wrong.")
    } finally {
      setloading(false)
    }
  }






  return (
    <div className=" realtive min-h-screen bg-linear-to-r from-primary to-secondary overflow-hidden ">

      <div className=" absolute inset-0 hidden md:block overflow-hidden pointer-events-none ">
        <div className=" absolute top-32 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse bg-pulse  " />
        <div className=" absolute top-1/2 right-1/2 w-72 h-72 rounded-full  blur-3xl animate-pulse overflow-hidden bg-pulse opacity-30  " />
        <div className=" absolute bottom-32 right-30 w-72 h-72 rounded-full overflow-hidden blur-3xl animate-pulse bg-pulse" />
      </div>

      {/* Header */}
      <header className="relative bg-primary backdrop-blur-xl border-b border-white/20 shadow-2xl top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-primary to-secondary rounded-2xl blur-lg opacity-75 animate-pulse" />
                <div className="relative w-14 h-14 bg-linear-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-2xl">
                  <Mic className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="font-black text-text text-2xl tracking-tight">
                  English Speech Transcriber
                </h1>
                <p className="text-xs text-text font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-Powered English Speech Recognition
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-xs text-white font-medium">Online</span>
            </div>
          </div>
        </div>
      </header>

      {!file && 
        <div>
          <label
          htmlFor="audio-upload" 
          className=" w-full md:w-4xl h-100 z-20 my-12 mx-auto bg-secondary hover:bg-primary hover:cursor-pointer rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-evenly shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-transform duration-100 ease-in-out group ">
            <input onChange={handleUpload} id="audio-upload" accept="audio//mp3,audio/wav" className="hidden" type="file" />
            
            <div className=" w-32 h-32 bg-[#5A7086] group-hover:bg-pulse rounded-2xl rotate-0 group-hover:rotate-6 transition-transform duration-100 ease-in-out flex flex-col items-center justify-center ">
              <Upload className=" w-[60%] h-[60%] text-white/90 "/>
            </div>
            <div className=" text-2xl text-white/90 text-center font-bold ">
              Upload English Audio</div>
            <div className=" text-white/90 text-center ">
              Drag And Drop Your English Audio File Here, or Browse</div>
            <div className=" flex gap-4 border-2 text-white/90 rounded-2xl border-pulse px-4 py-2 ">
              <AudioLines /> MP3, WAV
            </div>
        
        </label>

        <div className="max-w-4xl mx-auto my-4 relative h-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/50"></div>
          </div>

          <div className="relative flex justify-center">
            <span className="px-4 bg-primary backdrop-blur-md rounded-full text-white/90 font-bold text-sm">
              OR
            </span>
          </div>
        </div>

        <div className=" text-white/90 text-[min(10vw, 70px)] max-w-md mx-auto mt-12 text-2xl text-center ">
          Record Directly from your Microphone
        </div>

        <div className="relative w-full md:w-80 mx-auto mt-8 group">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`
              relative overflow-hidden
              w-full h-20 px-6
              flex items-center justify-center gap-4
              rounded-2xl border border-white/20
              ${isRecording ? "bg-red-600" : "bg-gray-900"} text-white font-bold text-2xl
              transition-all duration-400 ease-out
              hover:${isRecording ? "bg-red-400" : "bg-gray-800"} hover:shadow-xl
              active:scale-98
            `}
          >
            <span
              className={`
                absolute inset-0
                bg-linear-to-r from-transparent via-white/50 to-transparent
                -translate-x-full group-hover:translate-x-full
                transition-transform duration-500 ease-in-out
                pointer-events-none
              `}
            />

            <Mic className="w-10 h-10 text-white/90 group-hover:text-white transition-colors" />
            <span className="group-hover:text-white transition-colors">{isRecording ? "Stop Recording" : "Record Audio"}</span>
            <Sparkles className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </div>
        </div>
      }

      {file && (
        <div className="max-w-4xl mx-auto my-8 space-y-4">

          <button
            onClick={() => handleTranscribe()}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gray-900 hover:cursor-pointer hover:bg-gray-800 text-white font-bold border border-gray-800 disabled:opacity-50"
          >
            {loading ? "Transcribing..." : "Transcribe Audio"}
          </button>

          <p className="bg-secondary border-2 border-dashed border-gray-500 min-h-80 text-white/70 rounded-2xl overflow-hidden p-4">
            {output || "Your English transcription will appear here..."}
          </p>

        </div>
      )}



    </div>
  );
}