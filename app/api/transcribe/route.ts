import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const audioBuffer = await req.arrayBuffer()

    const formData = new FormData()
    formData.append(
      "file",
      new Blob([audioBuffer]),
      "audio.wav"
    )
    formData.append("model", "whisper-large-v3")
    formData.append("language", "am") // Amharic

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      }
    )

    const data = await groqRes.json()

    if (!groqRes.ok) {
      console.error("Groq error:", data)
      return NextResponse.json(
        { text: "Groq transcription failed." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      text: data.text ?? "No transcription returned.",
    })
  } catch (err) {
    console.error("GROQ ERROR:", err)
    return NextResponse.json(
      { text: "Transcription failed." },
      { status: 500 }
    )
  }
}
