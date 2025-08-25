class SMFModel {
  constructor(gl, file, texture, shaderProgram) {
    this._gl = gl;
    this._shaderProgram = shaderProgram;
    this._modelViewMatrix = mat4();
    this._projectionMatrix = mat4();
    this._totalLightSources = 0;
    this._texture = null;
    this.loadTexture(gl, texture).then(tex => {
      this._texture = tex;
    });
    this.loadFile(file);
    this.initBuffers();
  }

  loadFile(file) {
    const smf_file = file;
    const lines = smf_file.split('\n');
    const vertices = [];
    const faces = [];
    const textureCoords = [];

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let x, y, z;

    for (let line = 0; line < lines.length; line++) {
      const tokens = lines[line].trim().split(/\s+/);

      switch(tokens[0]) {
        case('v'):
          x = parseFloat(tokens[1]);
          y = parseFloat(tokens[2]);
          z = parseFloat(tokens[3]);

          vertices.push([x, y, z]);

          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          break;

        case('f'):
          faces.push([
            parseInt(tokens[1]) - 1,
            parseInt(tokens[2]) - 1,
            parseInt(tokens[3]) - 1
          ]);
          break;

        case ('vt'):
          textureCoords.push([
            parseFloat(tokens[1]),
            parseFloat(tokens[2])
          ]);
          break;
      }
    }

    this._size = subtract(vec3(maxX, maxY, maxZ), vec3(minX, minY, minZ));
    this._center = mult(0.5, add(vec3(maxX, maxY, maxZ), vec3(minX, minY, minZ)));

    const normalVectors = Array.from({ length: vertices.length }, () => []);
    const targetSize = vec3(1.0, 1.0, 1.0);
    const scale = Math.min(
      targetSize[0] / this._size[0],
      targetSize[1] / this._size[1],
      targetSize[2] / this._size[2]
    );

    this._size = mult(scale, this._size);

    this._vertexPositions = [];
    this._scaledTextureUVs = [];

    for (const face of faces) {
      for (let i = 0; i < 3; i++) {
        let orig = vertices[face[i]];
        let v = vec3(orig[0], orig[1], orig[2]);
        let offset = subtract(v, this._center);
        let scaled = mult(scale, offset);
        this._vertexPositions.push([scaled[0], scaled[1], scaled[2]]);

        // Use texture coordinate if available, otherwise fallback [0,0]
        if (textureCoords.length > 0) {
          const uv = textureCoords[face[i]];
          this._scaledTextureUVs.push(uv ? uv : [0, 0]);
        } else {
          this._scaledTextureUVs.push([0, 0]);
        }
      }

      const v0 = vertices[face[0]];
      const v1 = vertices[face[1]];
      const v2 = vertices[face[2]];

      const p0 = vec3(v0[0], v0[1], v0[2]);
      const p1 = vec3(v1[0], v1[1], v1[2]);
      const p2 = vec3(v2[0], v2[1], v2[2]);

      // Compute face normals
      const dir_1 = subtract(p1, p0);
      const dir_2 = subtract(p2, p0);
      const crossProduct = cross(dir_1, dir_2);
      const norm = normalize(crossProduct);

      for (let i = 0; i < 3; i++) {
        normalVectors[face[i]].push(norm);
      }
    }

    // Average vertex normals
    this.vertexNormals = [];

    for (const face of faces) {
      for (let i = 0; i < 3; i++) {
        const index = face[i];
        const normals = normalVectors[index];
        let sum = vec3(0, 0, 0);
        normals.forEach(n => { sum = add(sum, n); });
        const average = normalize(mult(1 / normals.length, sum));
        this.vertexNormals.push(average);
      }
    }

    this._scaledTextureUVs = this._scaledTextureUVs.map(uv => {
      return [
        Math.min(Math.max(uv[0], 0), 1),
        Math.min(Math.max(uv[1], 0), 1)
      ];
    });
  }

  createBuffer(dataArray) {
    const gl = this._gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(dataArray), gl.STATIC_DRAW);
    return buffer;
  }

  initBuffers() {
    const positionBuffer = this.createBuffer(this._vertexPositions);
    const normalBuffer = this.createBuffer(this.vertexNormals);
    const textureBuffer = this.createBuffer(this._scaledTextureUVs);

    this.buffers = {
      position: positionBuffer,
      normal: normalBuffer,
      texture: textureBuffer
    };
  }

  draw() {
    const gl = this._gl;
    gl.useProgram(this._shaderProgram);

    const aPosition = gl.getAttribLocation(this._shaderProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    const aNormal = gl.getAttribLocation(this._shaderProgram, "aNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    const aTexCoord = gl.getAttribLocation(this._shaderProgram, "aTexCoord");
    if (this.buffers.texture) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
      gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aTexCoord);
    } else {
      gl.disableVertexAttribArray(aTexCoord);
    }

    const modelViewMatrixLoc = gl.getUniformLocation(this._shaderProgram, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(this._modelViewMatrix));

    const projectionMatrixLoc = gl.getUniformLocation(this._shaderProgram, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(this._projectionMatrix));

    gl.uniform1i(gl.getUniformLocation(this._shaderProgram, "uTotalLightSources"), this._totalLightSources);

    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "ambientProducts"), flatten(this.ambientProducts));
    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "diffuseProducts"), flatten(this.diffuseProducts));
    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "specularProducts"), flatten(this.specularProducts));
    gl.uniform3fv(gl.getUniformLocation(this._shaderProgram, "lightPositions"), flatten(this.lightPositions));
    gl.uniform1f(gl.getUniformLocation(this._shaderProgram, "shininess"), this.materialShininess);

    if (this._texture && this._texture.loaded) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.uniform1i(gl.getUniformLocation(this._shaderProgram, 'uTexture'), 0);
    } else {
      // fallback or skip drawing texture
      console.warn('Texture not loaded yet');
      return;
    }

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexPositions.length);

    gl.disableVertexAttribArray(aPosition);
    gl.disableVertexAttribArray(aNormal);
    gl.disableVertexAttribArray(aTexCoord);
  }

  configureMaterialProperties(material, lightSources) {
    const MAX_LIGHTS = 8

    this.ambientProducts = [];
    this.diffuseProducts = [];
    this.specularProducts = [];
    this.lightPositions = [];
    this._totalLightSources = lightSources.length;

    for (const light of lightSources) {
      this.ambientProducts.push(mult(light._ambient, material._ambient));
      this.diffuseProducts.push(mult(light._diffuse, material._diffuse));
      this.specularProducts.push(mult(light._specular, material._specular));
      this.lightPositions.push(light._lightPos);
    }

    for (let i = lightSources.length; i < MAX_LIGHTS; i++) {
      this.ambientProducts.push([0, 0, 0, 0]);
      this.diffuseProducts.push([0, 0, 0, 0]);
      this.specularProducts.push([0, 0, 0, 0]);
      this.lightPositions.push([0, 0, 0]);
    }

    this.materialShininess = material._shininess;
  }

  setModelViewMatrix(eye, at, up) {
    this._modelViewMatrix = lookAt(eye, at, up);
  }

  setPerspective(fovy, aspect, near, far) {
    this._projectionMatrix = perspective(fovy, aspect, near, far);
  }

  setOrthographic(left, right, bottom, top, near, far) {
    this._projectionMatrix = ortho(left, right, bottom, top, near, far);
  }

  enableLightingAlgorithm(option) {
    this._shaderProgram = initShaders(this.gl, `./shaders/${option}_vert.glsl`, `./shaders/${option}_frag.glsl`);
  }

  loadTexture(gl, url) {
    const texture = gl.createTexture();
    texture.loaded = false;  // add flag
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Temporary 1x1 white pixel while loading
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([255, 255, 255, 255]));

    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                      gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        texture.loaded = true;  // mark loaded
        resolve(texture);       // resolve the Promise
      };

      image.onerror = (event) => {
        console.error(`Failed to load texture from ${url}`);
        console.error("Error event details:", event);
        reject(new Error(`Failed to load texture from ${url}: ${event.message || event}`));
      };

      image.src = url; // Start loading the image
    });
  }
}