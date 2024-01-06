import java.util.*;
import java.io.*;
import com.jogamp.opengl.*;
import java.nio.IntBuffer;
import java.awt.Robot;
import com.jogamp.newt.opengl.GLWindow;

PShader fractalShader, swapShader;
PGraphics buffer;
int frame;

int lastFrameTexture, nextFrameTexture;
IntBuffer intBuffer;

GL2GL3 gl3;

PVector camPos, camDir;
float theta, phi;
float speed = 0.5;
HashMap<Character, Boolean> keys;
boolean paused = false;
Robot robot;
GLWindow window;

void setup() {
  size(800, 800, P2D);
  surface.setLocation(1000, 100);
 
  String fragmentShaderFile = "shaders/fractal.frag";
  fractalShader = loadShader(fragmentShaderFile, "shaders/quad.vert");
  swapShader = loadShader("shaders/swap.frag", "shaders/quad.vert");
      
  TimerTask task = new FileWatcher(new File(sketchPath(fragmentShaderFile))) {
    protected void onChange(File file) {
      fractalShader = loadShader("shaders/fractal.frag", "shaders/quad.vert");
    }
  };
  
  buffer = createGraphics(800, 800, P2D);

  Timer timer = new Timer();
  timer.schedule(task , new Date(), 1000); // repeat the check every second
  
  camPos = new PVector(10, 0, 0);
  camDir = new PVector(-1, 0, 0);
  theta = 0;
  phi = 0;
  keys = new HashMap<>();
  
  PGraphicsOpenGL pg = ((PGraphicsOpenGL)g);
  PJOGL pjogl = (PJOGL)pg.pgl;
  GL gl = pjogl.gl;
  gl3 = gl.getGL2GL3();
  
  intBuffer = IntBuffer.allocate(2);
  gl3.glGenTextures(2, intBuffer);  
  lastFrameTexture = intBuffer.get(0);
  nextFrameTexture = intBuffer.get(1);
  
  gl3.glBindTexture(GL2GL3.GL_TEXTURE_2D, lastFrameTexture);
  gl3.glTexStorage2D(GL2GL3.GL_TEXTURE_2D, 1, GL2GL3.GL_RGBA32F, width, height);
  
  gl3.glBindTexture(GL2GL3.GL_TEXTURE_2D, nextFrameTexture);
  gl3.glTexStorage2D(GL2GL3.GL_TEXTURE_2D, 1, GL2GL3.GL_RGBA32F, width, height);
  
  println(gl3.glGetString(GL2GL3.GL_VERSION));
  
  frame = 1;
  
  window = (GLWindow)((PSurfaceJOGL)surface).getNative();
  try {
    robot = new Robot();
  } catch(Exception e) {
    println(e);
  }
  noCursor();
}

void draw() {
  background(255);
  
  if (!paused && updateCamera()) {
    int winX = window.getBounds().getX();
    int winY = window.getBounds().getY();
    robot.mouseMove(winX+width/2, winY+height/2);
    frame = 1;
  }
  
  
  
  fractalShader.set("mouse", mouseX / float(width), mouseY / float(height));
  fractalShader.set("time", frameCount/100.0);
  fractalShader.set("frame", frame);
  fractalShader.set("eye", camPos);
  fractalShader.set("forward", camDir);

  buffer.beginDraw();
  gl3.glBindImageTexture(3, lastFrameTexture, 0, false, 0, GL2GL3.GL_READ_ONLY, GL2GL3.GL_RGBA32F);
  gl3.glBindImageTexture(4, nextFrameTexture, 0, false, 0, GL2GL3.GL_WRITE_ONLY, GL2GL3.GL_RGBA32F);
  buffer.shader(fractalShader);
  buffer.rect(0, 0, width, height);
  buffer.endDraw();
  
  beginShape(QUAD);
  texture(buffer);
  vertex(0, 0, 0, 0);
  vertex(width, 0, width, 0);
  vertex(width, height, width, height);
  vertex(0, height, 0, height);
  endShape();
  
  buffer.beginDraw();
  gl3.glBindImageTexture(3, lastFrameTexture, 0, false, 0, GL2GL3.GL_WRITE_ONLY, GL2GL3.GL_RGBA32F);
  gl3.glBindImageTexture(4, nextFrameTexture, 0, false, 0, GL2GL3.GL_READ_ONLY, GL2GL3.GL_RGBA32F);
  buffer.shader(swapShader);
  buffer.rect(0, 0, width, height);
  buffer.endDraw();
    
  frame += 1;
}

void updateCamDir() {
  camDir = new PVector(
    sin(phi)*sin(theta),
    cos(phi),
    sin(phi)*cos(theta)
  ).normalize();
}


boolean updateCamera() {
  boolean updated = false;
  
  if (keys.containsKey('w') && keys.get('w')) {
    camPos.add(camDir.copy().mult(speed));
    updated = true;
  }
  if (keys.containsKey('s') && keys.get('s')) {
    camPos.sub(camDir.copy().mult(speed));
    updated = true;
  }
  
  PVector up = new PVector(0,1,0);
  if (abs(camDir.dot(up)) > 0.999) {
    up = new PVector(1,0,0);
  }
  PVector right = up.cross(camDir);
  
  if (keys.containsKey('a') && keys.get('a')) {
    camPos.add(right.copy().mult(speed));
    updated = true;
  }
  if (keys.containsKey('d') && keys.get('d')) {
    camPos.sub(right.copy().mult(speed));
    updated = true;
  }
  
  if (pmouseX != mouseX || pmouseY != mouseY) {
    float xDiff = width/2 - mouseX;
    float yDiff = height/2 - mouseY;
    
    theta -= xDiff * 0.01;
    phi -= yDiff * 0.01;
    
    phi = constrain(phi, 0.01, PI-0.01);
    
    updateCamDir();
    updated = true;
  }
  
  return updated;
}



public abstract class FileWatcher extends TimerTask {
  private long timeStamp;
  private File file;

  public FileWatcher( File file ) {
    this.file = file;
    this.timeStamp = file.lastModified();
  }
  
  public final void run() {
    long timeStamp = file.lastModified();
  
    if( this.timeStamp != timeStamp ) {
      this.timeStamp = timeStamp;
      onChange(file);
    }
  }
  
  protected abstract void onChange( File file );
}

void keyPressed() {
  if (keys.containsKey(key)) {
    keys.replace(key, true);
  } else {
    keys.put(key, true);
  }
  
  if (key == 'p') {
    long unixTime = System.currentTimeMillis() / 1000L;
    println("screenshot saved");
    save("./results/"+Long.toString(unixTime)+".png");
  } else if (key == 'c') {
    paused = !paused;
  }
}

void keyReleased() {
  keys.replace(key, false);
}
