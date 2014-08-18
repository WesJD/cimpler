var util       = require('util'),
    logger     = require('log4js').getLogger();

exports.init = function(config, cimpler) {
   /**
    * Listen for post-receive hooks
    */
   cimpler.registerMiddleware('/github', function(req, res, next) {
      // We only care about POSTs to "/github"
      if (req.method !== 'POST' || req.url !== '/') {
         return next();
      }

      try {
         var build = extractBuildInfo(req.body);
         if (build) {
            cimpler.addBuild(build);
         }
      } catch (e) {
         util.error("Bad Request");
         util.error(e.stack);
      }
      res.end();
   });
};

function extractBuildInfo(requestBody) {
   var info = JSON.parse(requestBody.payload);

   // If this is a pull_request event, we only care about ones that change the
   // HEAD commit (opened and synchronize)
   if (info.action &&
       info.action != 'synchronize' &&
       info.action != 'opened') {
      return;
   }

   // Filter out notifications about annotated tags
   if (info.ref.indexOf('refs/tags/') == 0) {
      return null;
   }

   // If we are using the "pull_request" github event type the structure of the
   // payload is a bitt different, so there are several ... || ... bits here.

   // ref: "refs/heads/master" or just "master"
   var branch = (info.ref || info.pull_request.head.ref).split('/').pop();

   // Build info structure
   return {
     repo   : "github.com" + '/' + info.repository.full_name,
     commit : info.after || info.pull_request.head.sha,
     branch : branch,
     status : 'pending'
   };
}

