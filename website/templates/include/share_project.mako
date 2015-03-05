<div id='social-media-sharing' class="panel panel-default">
    <div class="panel-body" style="padding: 5px">

        <!-- Facebook -->
        <div id="fb-root"></div>
        <script>(function(d, s, id) {
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) return;
          js = d.createElement(s);
          js.id = id;
          js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.0";
          fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));</script>
        <div class="fb-share-button" data-href="https://osf.io${node['url']}" data-layout="button"></div><br/>

        <!-- Twitter -->
        <a href="https://twitter.com/share" class="twitter-share-button" data-count="none">Tweet</a><br/>
        <script>!function(d,s,id){
            var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';
            if(!d.getElementById(id)){
                js=d.createElement(s);
                js.id=id;
                js.src=p+'://platform.twitter.com/widgets.js';
                fjs.parentNode.insertBefore(js,fjs);
            }
        }(document, 'script', 'twitter-wjs');
        </script>

        <!-- Linked in -->
        <script src="//platform.linkedin.com/in.js" type="text/javascript"> lang: en_US</script>
        <script type="IN/Share" data-url="https://osf.io${node['url']}"></script>
    </div>
</div>