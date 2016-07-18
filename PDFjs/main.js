/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2015, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
(function(DefaultApplication, DefaultApplicationWindow, Application, Window, Utils, API, VFS, GUI) {

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  function ApplicationPDFjsWindow(app, metadata, scheme, file) {
    DefaultApplicationWindow.apply(this, ['ApplicationPDFjsWindow', {
      allow_drop: true,
      icon: metadata.icon,
      title: metadata.name,
      width: 500,
      height: 400
    }, app, scheme, file]);

    this.pageCount = 0;
    this.pageIndex = 0;
    this.pdf = null;
    this.currentScale = 1.5;
  }

  ApplicationPDFjsWindow.prototype = Object.create(DefaultApplicationWindow.prototype);
  ApplicationPDFjsWindow.constructor = DefaultApplicationWindow.prototype;

  ApplicationPDFjsWindow.prototype.init = function(wmRef, app, scheme) {
    var root = DefaultApplicationWindow.prototype.init.apply(this, arguments);
    var self = this;
    

    // Load and set up scheme (GUI) here
    scheme.render(this, 'PDFWindow', root);

    scheme.find(this, 'Prev').on('click', function() {
      self.prevPage();
    });
    scheme.find(this, 'Next').on('click', function() {
      self.nextPage();
    });
    scheme.find(this, 'In').on('click', function() {
      self.zoomIn();
    });
    scheme.find(this, 'Out').on('click', function() {
      self.zoomOut();
    });
    scheme.find(this, 'Print').on('click', function() {
      self.printDocument();
    });
    scheme.find(this, 'First').on('click', function() {
      self.firstPage();
    });
    scheme.find(this, 'Last').on('click', function() {
      self.lastPage();
    });
    scheme.find(this, 'pageNumber').on('enter', function() {
      self.changePage();
    });
    scheme.find(this, 'Fullscreen').on('click', function() {
      self.fullScreenMode();
    });
    document.getElementById('canvas').addEventListener('wheel', function(){
        self.pageScroll();
    });

    return root;
  };

  ApplicationPDFjsWindow.prototype.destroy = function() {
    DefaultApplicationWindow.prototype.destroy.apply(this, arguments);
    this.pdf = null;
  };

  ApplicationPDFjsWindow.prototype.open = function(file, url) {
  };

  ApplicationPDFjsWindow.prototype.page = function(pageNum) {
    var self = this;

    if ( this.pageCount <= 0 || pageNum <= 0 || pageNum > this.pageCount ) {
      return;
    }

    var container = this._scheme.find(this, 'Content').$element;
    //Utils.$empty(container);

    this.pageIndex = pageNum;

    var statustext = Utils.format(' - {0}%', this.currentScale*100);
    var pageNumber = Utils.format('{0}/{1}', this.pageIndex, this.pageCount);
    this._scheme.find(this, 'Statusbar').set('value', statustext);
    this._scheme.find(this, 'pageNumber').set('value', pageNumber);

    this.pdf.getPage(this.pageIndex).then(function getPageHelloWorld(page) {
      var scale = self.currentScale;
      var viewport = page.getViewport(scale);
      var canvas = document.getElementById('canvas');
      var context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      context.clearRect(0, 0, viewport.width, viewport.height);

      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
    });
  };

  ApplicationPDFjsWindow.prototype.prevPage = function() {
    this.page(this.pageIndex-1);
  };

  ApplicationPDFjsWindow.prototype.nextPage = function() {
    this.page(this.pageIndex+1);
  };

  ApplicationPDFjsWindow.prototype.zoomIn = function() {
    this.currentScale += 0.5;
    this.page(this.pageIndex);
  };

  ApplicationPDFjsWindow.prototype.zoomOut = function() {
    if ( this.currentScale > 0.5 ) {
      this.currentScale -= 0.5;
    }
    this.page(this.pageIndex);
  };
  
  ApplicationPDFjsWindow.prototype.printDocument = function() {  
    var canvas = document.getElementById("canvas");  
    var img    = canvas.toDataURL("image/png");
    window.frames["print_frame"].document.body.innerHTML= '<img src="'+img+'"/>';
    window.frames["print_frame"].window.focus();
    window.frames["print_frame"].window.print();
  };
  
  ApplicationPDFjsWindow.prototype.firstPage = function() {
    this.page(1);
  };
  
  ApplicationPDFjsWindow.prototype.lastPage = function() {
    this.page(this.pageCount);
  };
  
  ApplicationPDFjsWindow.prototype.changePage = function() {      
    var pageNumber = Number(this._scheme.find(this, 'pageNumber').get('value'));
    if ( Math.floor(pageNumber) == pageNumber && pageNumber > 0 ) {
        if( pageNumber <= this.pageCount ) {
            this.page(pageNumber);
        } else {
            API.createDialog('Alert', {
            message: 'The page number \''+ pageNumber +'\' you inputted cannot be found in this document.'
            }, null, this);
            var _pageNumber = Utils.format('{0}/{1}', this.pageIndex, this.pageCount);
            this._scheme.find(this, 'pageNumber').set('value', _pageNumber);     
        }
    } else {        
        var _pageNumber = Utils.format('{0}/{1}', this.pageIndex, this.pageCount);
        this._scheme.find(this, 'pageNumber').set('value', _pageNumber);        
    }
  };

  ApplicationPDFjsWindow.prototype.fullScreenMode = function() {
    var content = document.getElementById("canvas"); 
    screenfull.request(content);
  };

  ApplicationPDFjsWindow.prototype.pageScroll = function() {
    var delta = 0;
    if (!event) 
            event = window.event;
    if (event.wheelDelta) { 
            delta = event.wheelDelta/120;
    } else if (event.detail) { 
            delta = -event.detail/3;
    }
    console.log(delta);
    if ( delta > 0 ) this.page(this.pageIndex-1); 
    else  this.page(this.pageIndex+1);
  };

  ApplicationPDFjsWindow.prototype.showFile = function(file, result) {
    var self = this;
    var container = this._scheme.find(this, 'Content').$element;

    //Utils.$empty(container);

    this.pageCount = 0;
    this.pageIndex = 0;

    PDFJS.getDocument(result).then(function getPdfHelloWorld(pdf) {
      self.pageCount = pdf.numPages;
      self.pdf = pdf;
      self.page(1);
    });

    DefaultApplicationWindow.prototype.showFile.apply(this, arguments);
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  function ApplicationPDFjs(args, metadata) {
    DefaultApplication.apply(this, ['ApplicationPDFjs', args, metadata, {
      readData: false
    }]);

    window.PDFJS = window.PDFJS || {};
    var src = API.getApplicationResource(this, 'vendor/pdf.js/src/worker_loader.js');
    PDFJS.workerSrc = src;
  }

  ApplicationPDFjs.prototype = Object.create(DefaultApplication.prototype);
  ApplicationPDFjs.constructor = DefaultApplication;

  ApplicationPDFjs.prototype.init = function(settings, metadata) {
    var self = this;
    DefaultApplication.prototype.init.call(this, settings, metadata, function(scheme, file) {
      self._addWindow(new ApplicationPDFjsWindow(self, metadata, scheme, file));
    });
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationPDFjs = OSjs.Applications.ApplicationPDFjs || {};
  OSjs.Applications.ApplicationPDFjs.Class = ApplicationPDFjs;

})(OSjs.Helpers.DefaultApplication, OSjs.Helpers.DefaultApplicationWindow, OSjs.Core.Application, OSjs.Core.Window, OSjs.Utils, OSjs.API, OSjs.VFS, OSjs.GUI);
