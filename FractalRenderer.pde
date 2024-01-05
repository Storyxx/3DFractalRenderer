import java.util.*;
import java.io.*;

PShader shader;

void setup() {
  size(800, 800, P2D);
 
  String fragmentShaderFile = "shaders/mandelbrot.frag";
  shader = loadShader(fragmentShaderFile, "shaders/quad.vert");
      
  TimerTask task = new FileWatcher(new File(sketchPath(fragmentShaderFile))) {
    protected void onChange(File file) {
      shader = loadShader("shaders/mandelbrot.frag", "shaders/quad.vert");
    }
  };

  Timer timer = new Timer();
  // repeat the check every second
  timer.schedule( task , new Date(), 1000 );
}

void draw() {
  background(255);
  
  shader.set("mouse", mouseX / float(width), mouseY / float(height));
  shader.set("time", frameCount/100.0);

  shader(shader);

  rect(0, 0, width, height);
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
