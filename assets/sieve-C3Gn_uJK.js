function o(t){for(var e={},n=t.split(" "),r=0;r<n.length;++r)e[n[r]]=!0;return e}var l=o("if elsif else stop require"),s=o("true false not");function i(t,e){var n=t.next();if(n=="/"&&t.eat("*"))return e.tokenize=a,a(t,e);if(n==="#")return t.skipToEnd(),"comment";if(n=='"')return e.tokenize=p(n),e.tokenize(t,e);if(n=="(")return e._indent.push("("),e._indent.push("{"),null;if(n==="{")return e._indent.push("{"),null;if(n==")"&&(e._indent.pop(),e._indent.pop()),n==="}")return e._indent.pop(),null;if(n==","||n==";"||/[{}\(\),;]/.test(n))return null;if(/\d/.test(n))return t.eatWhile(/[\d]/),t.eat(/[KkMmGg]/),"number";if(n==":")return t.eatWhile(/[a-zA-Z_]/),t.eatWhile(/[a-zA-Z0-9_]/),"operator";t.eatWhile(/\w/);var r=t.current();return r=="text"&&t.eat(":")?(e.tokenize=f,"string"):l.propertyIsEnumerable(r)?"keyword":s.propertyIsEnumerable(r)?"atom":null}function f(t,e){return e._multiLineString=!0,t.sol()?(t.next()=="."&&t.eol()&&(e._multiLineString=!1,e.tokenize=i),"string"):(t.eatSpace(),t.peek()=="#"?(t.skipToEnd(),"comment"):(t.skipToEnd(),"string"))}function a(t,e){for(var n=!1,r;(r=t.next())!=null;){if(n&&r=="/"){e.tokenize=i;break}n=r=="*"}return"comment"}function p(t){return function(e,n){for(var r=!1,u;(u=e.next())!=null&&!(u==t&&!r);)r=!r&&u=="\\";return r||(n.tokenize=i),"string"}}const d={name:"sieve",startState:function(t){return{tokenize:i,baseIndent:t||0,_indent:[]}},token:function(t,e){return t.eatSpace()?null:(e.tokenize||i)(t,e)},indent:function(t,e,n){var r=t._indent.length;return e&&e[0]=="}"&&r--,r<0&&(r=0),r*n.unit},languageData:{indentOnInput:/^\s*\}$/}};export{d as sieve};