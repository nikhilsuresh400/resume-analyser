import { useState, useEffect } from 'react';
import constants, { buildPresenceChecklist, METRIC_CONFIG } from '../constants.js';
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { FaRegFilePdf } from 'react-icons/fa';
import { LuRefreshCcw, LuCheck, LuGithub } from 'react-icons/lu';
import { BsFillLightningChargeFill } from 'react-icons/bs';

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
      Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1).then(
        (page) =>
          page
            .getTextContent()
            .then((tc) => tc.items.map((i) => i.str).join(""))
      )
      ));
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
    <div className='min-h-screen flex flex-col'>


      {/* CONTENT START */}
      <main className='flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center'>
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
                  <FaRegFilePdf className='text-secondaryText-light/60 group-hover:text-theme-blue/70 transition-colors duration-500 ease-in-out' />
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
                  className={`inline-block btn-primary ${!aiReady ? "opacity-50 cursor-not-allowed" : ""}`}>
                  Choose PDF File
                </label>
              </div>
            </div>
          )}

          {/* LOADING SCREEN */}
          {isLoading && (
            <div className='p-6 sm:p-8 max-w-md mx-auto'>
              <div className='text-center'>
                <div className='loading-spinner'></div>
                <h3 className='text-lg sm:text-xl text-secondaryText-light mb-2'>
                  Analyzing Your Resume
                </h3>
                <p className='text-secondaryText-light text-sm sm:text-base'>Please wait while AI reviews your resume...</p>
              </div>
            </div>
          )}

          {/* AFTER ANALYSIS PAGE */}
          {analysis && uploadFile && (
            <div className='space-y-6 p-4 sm:px-8 lg:px-16'>
              <div className='file-info-card'>
                <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                  <div className='flex items-center gap-4'>
                    <div className='icon-container-xl bg-linear-to-br from-surface-light border-divider-light'>
                      <span className='text-3xl'><FaRegFilePdf className='text-secondaryText-light/60' /></span>
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-green-500 mb-1'>Analysis Complete</h3>
                      <p className='text-secondaryText-light text-sm break-all'>
                        {uploadFile.name}
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-3'>
                    <button onClick={reset}
                      className='btn-secondary flex items-center gap-2'><LuRefreshCcw />New Analysis
                    </button>
                  </div>
                </div>
              </div>

              {/* OVERALL SCORE */}
              <div className='score-card'>
                <div className='text-center mb-6'>
                  <div className='flex items-center justify-center gap-2 mb-3'>
                    <span className='text-2xl'>🏆</span>
                    <h2 className='text-2xl sm:text-2xl font-semibold text-primaryText-light'>Overall Score</h2>
                  </div>
                  <div className='relative'>
                    <p className='text-6xl sm:text-8xl font-bold text-theme-blue drop-shadow-lg'>
                      {analysis.overallScore || "7"}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${parseInt(analysis.overallScore) >= 8
                    ? "score-status-excellent"
                    : parseInt(analysis.overallScore) >= 6
                      ? "score-status-good"
                      : "score-status-improvement"
                    }`}>
                    <span className='text-lg'>
                      {parseInt(analysis.overallScore) >= 8
                        ? "🌟"
                        : parseInt(analysis.overallScore) >= 6
                          ? "⭐"
                          : "📈"}
                    </span>
                    <span className='font-semibold text-lg'>
                      {parseInt(analysis.overallScore) >= 8
                        ? "Excellent"
                        : parseInt(analysis.overallScore) >= 6
                          ? "Good"
                          : "Needs Improvement"}
                    </span>
                  </div>
                </div>
                <div className='progress-bar'>
                  <div className={`h-full rounded-full transition-all
                  duration-1000 ease-out shadow-sm ${parseInt(analysis.overallScore) >= 8
                      ? "progress-excellent"
                      : parseInt(analysis.overallScore) >= 6
                        ? "progress-good"
                        : "progress-improvement"
                    }`}
                    style={{
                      width: `${(parseInt(analysis.overallScore) / 10) * 100}%`
                    }}
                  ></div>
                </div>

                <p className='text-secondaryText-light text-sm mt-3 text-center font-medium'>
                  Score based on content quality, formatting and keyword usage.
                </p>
              </div>

              {/* STRENGTHS & IMPROVEMENTS */}
              <div className='grid sm:grid-cols-2 gap-4'>

                {/* TOP STRENGTHS */}
                <div className='feature-card-green group'>
                  <div className='bg-green-400/70 icon-container-lg mx-auto mb-3 transition-colors'>
                    <span className='text-primaryText-dark text-2xl'><LuCheck /></span>
                  </div>
                  <h4
                    className='text-green-400/70 text-sm font-semibold
                    uppercase tracking-wide mb-3'>Top Strengths</h4>
                  <div className='space-y-2 text-left'>

                    {analysis.strengths.slice(0, 3).map((strength, index) => (
                      <div key={index}
                        className='list-item-green'>
                        <span className='text-green-500 text-sm mt-0.5 font-extrabold'>·</span>
                        <span className='text-green-400 font-medium text-sm leading-relaxed'>
                          {strength}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MAIN IMPROVEMENTS */}
                <div className='feature-card-orange group'>
                  <div className='bg-orange-400/70 icon-container-lg mx-auto mb-3 transition-colors'>
                    <span className='text-primaryText-dark text-2xl'>< BsFillLightningChargeFill /></span>
                  </div>
                  <h4
                    className='text-orange-400/70 text-sm font-semibold
                    uppercase tracking-wide mb-3'>Main Improvements</h4>
                  <div className='space-y-2 text-left'>

                    {analysis.improvements.slice(0, 3).map((improvement, index) => (
                      <div key={index}
                        className='list-item-orange'>
                        <span className='text-orange-500 text-sm mt-0.5 font-extrabold'>·</span>
                        <span className='text-orange-400 font-medium text-sm leading-relaxed'>
                          {improvement}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* EXECUTIVE SUMMARY */}
              <div className='section-card group'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='icon-container bg-[#333]'>
                    <span className='text-purple-300 text-lg'>📝</span>
                  </div>
                  <h4 className='text-xl font-bold text-primaryText-light'>Executive Summary</h4>
                </div>
                <div className='summary-box'>
                  <p className='text-primaryText-light text-sm sm:text-base leading-relaxed'>
                    {analysis.summary}
                  </p>
                </div>
              </div>

              {/* PERFORMANCE METRICS */}
              <div className='section-card group'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='icon-container bg-theme-blue/20'>
                    <span className='text-cyan-300 text-lg'>📊</span>
                  </div>
                  <h4 className='text-xl font-bold text-primaryText-light'>Performance Metrics</h4>
                </div>


                <div className='space-y-4'>
                  {METRIC_CONFIG.map((cfg, i) => {
                    const value = analysis.performanceMetrics?.[cfg.key] ?? cfg.defaultValue;
                    return <div key={i} className='group/item'>
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <span className='text-lg'>{cfg.icon}</span>
                          <p className='text-primaryText-light font-normal'>{cfg.label}</p>
                        </div>
                        <span className='text-primaryText-light font-semibold'>{value}/10</span>
                      </div>
                      <div className='progress-bar-small'>
                        <div className={`h-full bg-linear-to-r ${cfg.colorClass} rounded-full 
                        transition-all duration-1000 ease-out group-hover/item:shadow-lg ${cfg.shadowClass}`}
                          style={{ width: `${(value / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  })}
                </div>
              </div>

              {/* RESUME INSIGHTS */}
              <div className='section-card group'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='icon-container bg-theme-blue/20'>
                    <span className='text-lg text-purple-300'>🔍</span>
                  </div>
                  <h2 className='text-xl font-bold text-primaryText-light'>Resume Insights</h2>
                </div>
                <div className='grid gap-4'>
                  <div className='info-box-cyan group/item'>
                    <div className='flex items-center gap-3 mb-2'>
                      <span className='text-lg text-cyan-400'>🎯</span>
                      <h3 className='text-primaryText-light font-semibold'>Action Items</h3>
                    </div>
                    <div className='space-y-2'>
                      {(
                        analysis.actionItems || [
                          "Optimize keyword placement for better ATS scoring",
                          "Enhance content with quantifiable achievements",
                          "Consider industry-specific terminology",
                        ]).map((item, index) => (
                          <div className='list-item-cyan'
                            key={index}>
                            <span className='text-cyan-500'>•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className='info-box-emerald group/item'>
                    <div className='flex items-center gap-3 mb-2'>
                      <span>💡</span>
                      <h3 className='text-primaryText-light font-semibold'>Pro Tips</h3>
                    </div>
                    <div className='space-y-2'>
                      {(
                        analysis.proTips || [
                          "Use action verbs to start bullet points",
                          "Keep descriptions consice and impactful",
                          "Tailor keywords to specific job descriptions",
                        ]
                      ).map((tip, index) => (
                        <div key={index}
                          className='list-item-emerald'>
                          <span className='text-emerald-500'>•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ATS Optimization */}
              <div className='section-card group'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='icon-container bg-theme-blue/20'>
                    <span className='text-lg'>🤖</span>
                  </div>
                  <h2 className='text-primaryText-light font-semibold text-xl'>
                    ATS Optimization
                  </h2>
                </div>

                <div className='info-box-violet mb-4'>
                  <div className='flex items-start gap-3 mb-3'>
                    <div>
                      <h3 className='text-primaryText-light font-semibold mb-2'>What is ATS?</h3>
                      <p className='text-primaryText-light text-sm leading-relaxed'>
                        <strong className='text-theme-blue'>
                          Applicant Tracking System (ATS)
                        </strong>{" "}
                        are software tools used by 75%+ of employers to automatically screen resumes before human
                        review. These systems scan for keywords, proper formatting, and relevant qualifications to
                        rank candidates. If your resume isn't ATS-friendly, it may never reach a human recruiter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ATS COMPATIBILITY CHECKLIST */}
                <div className='info-box-violet'>
                  <div className='flex items-center gap-3 mb-3'>
                    <span className='text-violet-300 text-lg'>🤖</span>
                    <h3 className='text-lg font-semibold text-primaryText-light'>
                      ATS Compatibility Checklist
                    </h3>
                  </div>
                  <div className='space-y-2'>
                    {(presenceChecklist || []).map((item, index) => (
                      <div key={index}
                        className='flex items-start gap-2 text-primaryText-light'>
                        <span className={`
                          ${item.present ?
                            "text-emerald-400" :
                            "text-red-400"}
                          `}
                        >
                          {item.present ? "✅" : "❌"}
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className='section-card group'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='icon-container bg-theme-blue/20'>
                    <span className='text-lg'>🔑</span>
                  </div>

                  <h2 className='text-primaryText-ligh font-semibold text-xl'>
                    Recommended Keywords
                  </h2>
                </div>
                <div className='flex flex-wrap gap-3 mb-4'>
                  {analysis.keywords.map((k, i) => (
                    <span key={i} className='keyword-tag group/item'>
                      {k}
                    </span>
                  ))}
                </div>
                <div className='info-box-blue'>
                  <p className='text-primaryText-light text-sm leading-relaxed 
                  flex items-start gap-2'>
                    <span className='text-lg mt-0.5'>💡</span>
                    Consider incorporating these keywords naturally into your resume to improve ATS compatibility
                    and increase your chances of getting noticed by recruiters.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>


      {/* FOOTER */}
      <footer className="container mx-auto relative mt-16 py-6 text-center text-xs sm:text-sm text-secondaryText-light border-t border-divider-light">
        <p>
          © {new Date().getFullYear()} AI Resume Analyzer by Nikhil Suresh. All rights reserved.
        </p>
        <p className="mt-1 opacity-60">
          Built for resume analysis and ATS optimization.
        </p>
        <a href='' className='cursor-pointer hover:underline underline-offset-2 mt-4 flex items-center justify-center gap-1 group'>
          <span><LuGithub className='group-hover:text-theme-blue transition' /></span>View this tool's Github Repo
        </a>
      </footer>
    </div>
  )
}

export default App
