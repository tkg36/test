class SphereMarker {
  constructor(gl, name, divContainerElement, shaderProgram, color = [0, 0, 1, 1], radius = 0.1, latSegments = 16, longSegments = 16) {
    this.gl = gl;
    this.name = name;
    this.radius = radius;
    this.latSegments = latSegments;
    this.longSegments = longSegments;

    this.setupContainerElement(divContainerElement, name, color);
    this.textVisible = false;

    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.coordinatePosition = null;

    this.vertexCount = 0;
    this._shaderProgram = shaderProgram;
    this.initBuffers();
  }

  setupContainerElement(divContainerElement, name, color) {
    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    this.div.style.pointerEvents = 'none';
    this.div.style.color = color;
    this.div.style.fontFamily = 'Arial, sans-serif';
    this.div.style.fontSize = '12px';
    this.div.style.fontWeight = 'bold';
    this.div.style.textShadow = '1px 1px 2px black';
    this.div.style.transform = 'translate(-50%, -50%)';
    this.div.style.whiteSpace = 'nowrap';

    this.div.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    this.div.style.padding = '2px 4px';
    this.div.style.borderRadius = '3px';

    this.textNode = document.createTextNode(name);
    this.div.appendChild(this.textNode);

    divContainerElement.appendChild(this.div);
  }

  initBuffers() {
    const vertices = [];
    const indices = [];

    for (let lat = 0; lat <= this.latSegments; lat++) {
      const theta = lat * Math.PI / this.latSegments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= this.longSegments; lon++) {
        const phi = lon * 2 * Math.PI / this.longSegments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = this.radius * cosPhi * sinTheta;
        const y = this.radius * cosTheta;
        const z = this.radius * sinPhi * sinTheta;

        vertices.push(x, y, z);
      }
    }

    for (let lat = 0; lat < this.latSegments; lat++) {
      for (let lon = 0; lon < this.longSegments; lon++) {
        const first = (lat * (this.longSegments + 1)) + lon;
        const second = first + this.longSegments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    const gl = this.gl;
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    this.vertexCount = indices.length;
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

  draw(modelViewMatrix, projectionMatrix) {
    const gl = this.gl;
    gl.useProgram(this._shaderProgram);

    const aPosition = gl.getAttribLocation(this._shaderProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.uniform1i(gl.getUniformLocation(this._shaderProgram, "uTotalLightSources"), this._totalLightSources);
    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "ambientProducts"), flatten(this.ambientProducts));
    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "diffuseProducts"), flatten(this.diffuseProducts));
    gl.uniform4fv(gl.getUniformLocation(this._shaderProgram, "specularProducts"), flatten(this.specularProducts));
    gl.uniform3fv(gl.getUniformLocation(this._shaderProgram, "lightPositions"), flatten(this.lightPositions));
    gl.uniform1f(gl.getUniformLocation(this._shaderProgram, "shininess"), this.materialShininess);

    const uModelViewMatrix = gl.getUniformLocation(this._shaderProgram, "modelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(this._shaderProgram, "projectionMatrix");
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    if (this.vertexCount === 0) {
      console.warn("SphereMarker: no indices to draw!");
      return;
    }
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

    if (this.textVisible) {
      this.renderText(modelViewMatrix, projectionMatrix);
    }
  }

  renderText(modelViewMatrix, projectionMatrix) {
    let point = vec4(this.radius, 0, 0, 1);

    let clipspace = mult(projectionMatrix, mult(modelViewMatrix, point));
    clipspace[0] /= clipspace[3];
    clipspace[1] /= clipspace[3];

    let pixelX = (clipspace[0] *  0.5 + 0.5) * gl.canvas.width;
    let pixelY = (clipspace[1] * -0.5 + 0.5) * gl.canvas.height;

    this.div.style.left = Math.floor(pixelX) + "px";
    this.div.style.top  = Math.floor(pixelY) + "px";
    this.textNode.nodeValue = this.name;
  }
}
