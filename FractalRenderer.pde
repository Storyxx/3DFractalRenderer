import java.util.*;
import java.io.*;
import com.jogamp.opengl.*;
import java.nio.IntBuffer;

PShader fractalShader, swapShader;
PGraphics buffer;
int frame;

int lastFrameTexture, nextFrameTexture;
IntBuffer intBuffer;

GL2GL3 gl3;

void setup() {
  size(800, 800, P2D);
  surface.setLocation(1000, 100);
 
  String fragmentShaderFile = "shaders/mandelbrot.frag";
  fractalShader = loadShader(fragmentShaderFile, "shaders/quad.vert");
  swapShader = loadShader("shaders/swap.frag", "shaders/quad.vert");
      
  TimerTask task = new FileWatcher(new File(sketchPath(fragmentShaderFile))) {
    protected void onChange(File file) {
      fractalShader = loadShader("shaders/mandelbrot.frag", "shaders/quad.vert");
    }
  };
  
  buffer = createGraphics(800, 800, P2D);

  Timer timer = new Timer();
  // repeat the check every second
  timer.schedule( task , new Date(), 1000 );
  
  
  buffer.beginDraw();
  buffer.background(0);
  buffer.endDraw();
  
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
}

void draw() {
  background(255);
  
  if (pmouseX != mouseX || pmouseY != mouseY) {
    /*buffer.beginDraw();
    buffer.background(0);
    buffer.endDraw();*/
    frame = 1;
  }
  
  fractalShader.set("mouse", mouseX / float(width), mouseY / float(height));
  fractalShader.set("time", frameCount/100.0);
  //shader.set("accumulation", buffer);
  fractalShader.set("frame", frame);

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
  if (key == 'p') {
    long unixTime = System.currentTimeMillis() / 1000L;
    println("screenshot saved");
    save("./results/"+Long.toString(unixTime)+".png");
  }
}
