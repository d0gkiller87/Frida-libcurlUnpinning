/*
  Enums can be found in:
  https://github.com/curl/curl/blob/master/packages/OS400/curl.inc.in
*/

const CURLOPT_CUSTOMREQUEST = 10036;
const CURLOPT_URL = 10002;
const CURLOPT_POSTFIELDS = 10015;
const CURLOPT_HTTPHEADER = 10023;

const CURLOPT_SSL_VERIFYPEER = 64;
const CURLOPT_SSL_VERIFYHOST = 81;
const CURLOPT_PINNEDPUBLICKEY = 10230;

const CURLOPT_PROXY = 10004;
const CURLOPT_PROXYTYPE = 101;

const NUL = ptr( '0x00' );

function hook_curl_easy_setopt( curl_easy_setopt_ptr, proxy_str = null ) {
  const curl_easy_setopt_function_str = new NativeFunction( curl_easy_setopt_ptr, 'void', [ 'pointer', 'int32', 'pointer' ] );
  const curl_easy_setopt_function_long = new NativeFunction( curl_easy_setopt_ptr, 'void', [ 'pointer', 'int32', 'long' ] );
  
  let proxy_str_ptr = null;
  if ( proxy_str ) {
    const proxy_str_ptr = Memory.alloc( proxy_str.length + 1 );
    Memory.writeUtf8String( proxy_str_ptr, proxy_str );
  }
  
  Interceptor.attach( func, {
    onEnter: function ( args ) {
      if ( proxy_str_ptr ) {
        curl_easy_setopt_function_str( args[0], CURLOPT_PROXY, proxy_str_ptr );
      }

      // Log requests for brief overview
      const opt = args[1].toInt32();

      switch ( opt ) {
        case CURLOPT_CUSTOMREQUEST:
          console.log( `Method = ${ args[2].readCString() }` );
        break;
        case CURLOPT_URL:
          console.log( `URL = ${ args[2].readCString() }` );
        break;
        case CURLOPT_POSTFIELDS:
          console.log( 'Method = POST' );
        break;
      }

      // Clear SSL related options
      curl_easy_setopt_function_long( args[0], CURLOPT_SSL_VERIFYPEER, 0 );
      curl_easy_setopt_function_long( args[0], CURLOPT_SSL_VERIFYHOST, 0 );
      curl_easy_setopt_function_long( args[0], CURLOPT_PINNEDPUBLICKEY, 0 );

      if (
        opt == CURLOPT_SSL_VERIFYPEER ||
        opt == CURLOPT_SSL_VERIFYHOST ||
        opt == CURLOPT_PINNEDPUBLICKEY
      ) {
        args[2] = NUL;
        console.log( `[+] Bypassed libcurl SSL Pinning ( opt = ${ opt } )` );
      }
    }
  });
}

function find_curl_easy_setopt_and_hook() {
  let is_curl_located = false;
  const modules = Process.enumerateModules();

  for ( const _module of modules ) {
    const curl_easy_setopt_ptr = _module.findExportByName( 'curl_easy_setopt' );

    if ( curl_easy_setopt_ptr != null ) {
      is_curl_located = true;
      console.log( `[+] Located curl_easy_setopt in ${ _module.name }` )
      hook_curl_easy_setopt( curl_easy_setopt_ptr );
      // hook_curl_easy_setopt( curl_easy_setopt_ptr, "http://127.0.0.1:8080" ); // example of specifying a proxy
    }
  }

  if ( !is_curl_located ) {
    console.log( '[-] Cannot locate export curl_easy_setopt' );
  }
}

if ( Java.available ) {
  Java.perform( find_curl_easy_setopt_and_hook );
} else {
  find_curl_easy_setopt_and_hook();
}
