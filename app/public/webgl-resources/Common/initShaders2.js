// Get a file as a string using  AJAX
function loadFileAJAX(name) {
  var xhr = new XMLHttpRequest(),
  okStatus = document.location.protocol === "file:" ? 0 : 200;
  xhr.open('GET', name, false);
  xhr.send(null);
  return xhr.status == okStatus ? xhr.responseText : null;
};


function initShaders(gl, vShaderName, fShaderName) {
  function getShader(gl, shaderName, type) {
    var shader = gl.createShader(type),
      shaderScript = loadFileAJAX(shaderName);
    if (!shaderScript) {
      alert("Could not find shader source: "+shaderName);
    }
    gl.shaderSource(shader, shaderScript);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  var vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER),
    fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER),
    program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
    return null;
  }

  return program;
};

function initShadersFromSource(gl, vertexSrc, fragmentSrc) {
  function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  const vertexShader = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Shader program link error:', gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

