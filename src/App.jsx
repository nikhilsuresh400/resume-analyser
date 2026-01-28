
import { useState, useEffect } from 'react';
import constants, { buildPresenceChecklist, METRIC_CONFIG } from '../constants.js';
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const App = () => {
  return (
    <div className='min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center
      bg-linear-to-bl from-black/16 from-2% to-transparent'>
        <h1 className='text-7xl text-center text-primaryText-light'>
          RESUME ANALYSER
        </h1>
    </div>
  )
}

export default App
