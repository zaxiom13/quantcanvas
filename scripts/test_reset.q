/ Test script for resetServer function
\l scripts/reset_server.q

/ Test if function exists
-1"Function type: ",string type resetServer;

/ Test simple call
-1"Testing resetServer function...";
result: resetServer[];
-1"Result: ",.Q.s result; 