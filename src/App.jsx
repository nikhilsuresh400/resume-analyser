import { useState, useEffect } from 'react';
import constants, { buildPresenceChecklist, METRIC_CONFIG } from '../constants.js';
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { FaRegFilePdf } from 'react-icons/fa';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const App = () => {

  const [aiReady, setAiReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [presenceChecklist, setPresenceChecklist] = useState([]);

  // CHECKING IF AI IS LOADED OR NOT
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setAiReady(true);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data:
        arrayBuffer
    }).promise;

    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)).then(
        (page) =>
          page
            .getTextContent()
            .then((tc) => tc.items.map((i) => i.str).join(""))
      )
    );
    return texts.join("\n").trim();       //JOINING EVERYTHING
  };


  const parseJSONResponse = (reply) => {
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      if (!parsed.overallScore && !parsed.error) {
        throw new Error("Inavlid AI response");
      }
      return parsed;

    } catch (err) {
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  };

  const analyzeResume = async (text) => {
    const prompt = constants.ANALYZE_RESUME_PROMPT.replace(
      "{{DOCUMENT_TEXT}}",
      text
    );
    const response = await window.puter.ai.chat(
      [
        { role: "system", content: "You are an expert resume reviewer..." },
        { role: "user", content: prompt },
      ],
      {
        model: "gpt-4o",
      }
    );

    const result = parseJSONResponse(
      typeof response === "string" ? response : response.message?.content || ""
    );
    if (result.error) throw new Error(result.error);
    return result;
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      return alert("Please upload a PDF file only.");
    }

    setUploadFile(file);
    setIsLoading(true);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);

    try {
      const text = await extractPDFText(file);
      setResumeText(text);
      setPresenceChecklist(buildPresenceChecklist(text));
      setAnalysis(await analyzeResume(text));
    } catch (err) {
      alert(`Error: ${err.message}`);
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setUploadFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
  };

  return (
    <div className='min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center'>
      
      <div className='max-w-5xl mx-auto w-full'>

        <div className='text-center mb-6'>
          <h1 className='text-5xl sm:text-6xl lg:text-7xl mb-2'>
            AI Resume <span className='font-heading font-normal italic text-theme-blue'>Analyzer</span>
          </h1>
          <p className='text-secondaryText-light text-sm sm:text-base'>
            Upload your PDF resume and get instant AI feedback.
          </p>
        </div>

        {!uploadFile && (
          <div className='upload-area group'>
            <div className='upload-zone'>
              <div className='place-items-center text-4xl sm:text-5xl lg:text-6xl mb-4'>
                <FaRegFilePdf className='text-secondaryText-light/60 group-hover:text-theme-blue/70 transition-colors duration-500 ease-in-out'/>
              </div>
              <h3 className='text-xl mb-2 sm:text-2xl text-primaryText-light'>
                Upload Your Resume
              </h3>
              <p className='text-secondaryText-light mb-4 sm:mb-6 text-sm sm:text-base'>
                PDF files only - Get instant analysis
              </p>

              <input type="file" accept='.pdf'
                onChange={handleFileUpload}
                disabled={!aiReady}
                className='hidden'
                id='file-upload'
              />
              <label htmlFor="file-upload"
                className={`inline-block btn-primary ${ !aiReady ? "opacity-50 cursor-not-allowed" : ""}`}>
                  Choose PDF File
                </label>
            </div>
          </div>
        )}

        {isLoading && (
          <div className='p-6 sm:p-8 max-w-md mx-auto'>
            <div className='text-center'>
              <div className='loading-spinner'></div>
              <h3 className='text-lg sm:text-xl text-secondaryText-light mb-2'>
                Analyzing Your Resume
              </h3>
              <p className=''>Please wait while AI reviews your resume...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
