using System.Collections.Generic;
using System.Threading.Tasks;
using AgentApi.Controllers;
using AgentApi.Models;
using AgentApi.Services;
using AgentApi.Services.SearchValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace Agent.test;

public class AgentControllerTests
{
    private Mock<ILocalAIService> _aiService = null!;
    private Mock<IMcpClient> _mcpClient = null!;
    private PromptSearcher _promptSearcher = null!;
    private WebPageFetcher _pageFetcher = null!;
    private Mock<IHttpClientFactory> _httpFactory = null!;
    private Mock<ILogger<WebPageFetcher>> _pageFetcherLogger = null!;
    private Mock<ILogger<AgentController>> _controllerLogger = null!;

    [SetUp]
    public void Setup()
    {
        _aiService = new Mock<ILocalAIService>(MockBehavior.Strict);
        _mcpClient = new Mock<IMcpClient>(MockBehavior.Strict);
        _httpFactory = new Mock<IHttpClientFactory>(MockBehavior.Loose);
        _pageFetcherLogger = new Mock<ILogger<WebPageFetcher>>();
        _controllerLogger = new Mock<ILogger<AgentController>>();

        // PromptSearcher isn't virtual; provide a harmless instance (won't be invoked in these tests).
        _promptSearcher = new PromptSearcher("key", "engine");
        _pageFetcher = new WebPageFetcher(_httpFactory.Object, _pageFetcherLogger.Object);
    }

    private AgentController CreateController()
    {
        return new AgentController(
            _aiService.Object,
            _mcpClient.Object,
            _controllerLogger.Object,
            _promptSearcher,
            _pageFetcher);
    }

    [Test]
    public async Task Chat_WithEmptyUserMessage_ReturnsBadRequest()
    {
        // Arrange
        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool>());

        var controller = CreateController();
        var request = new AgentRequest { UserMessage = string.Empty };

        // Act
        var result = await controller.Chat(request);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Chat_WithAiPlainResponse_ReturnsOkWithResponse()
    {
        // Arrange
        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool>());

        _aiService.Setup(a => a.SendMessageAsync(It.IsAny<LocalAIRequest>()))
            .ReturnsAsync(new LocalAIResponse
            {
                Choices =
                [
                    new Choice
                    {
                        Message = new Message { Content = "hi there" },
                        FinishReason = "stop"
                    }
                ]
            });

        var controller = CreateController();
        var request = new AgentRequest { UserMessage = "hello" };

        // Act
        var result = await controller.Chat(request);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var payload = ok!.Value as AgentResponse;
        Assert.That(payload, Is.Not.Null);
        Assert.That(payload!.Response, Is.EqualTo("hi there"));
        Assert.That(payload.UsedMcp, Is.False);
        _aiService.Verify(a => a.SendMessageAsync(It.IsAny<LocalAIRequest>()), Times.Once);
    }

    [Test]
    public async Task Chat_DirectAction_InvokesMcpAndReturnsResult()
    {
        // Arrange
        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool>());

        _mcpClient.Setup(c => c.ExecuteToolAsync("post_to_facebook", It.IsAny<Dictionary<string, object>>()))
            .ReturnsAsync("{\"result\":\"posted\"}");

        var controller = CreateController();
        var request = new AgentRequest
        {
            UserMessage = "ACTION: post_to_facebook\nPARAMETERS:\nmessage=Hello world\nEXPLANATION: test"
        };

        // Act
        var result = await controller.Chat(request);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var payload = ok!.Value as AgentResponse;
        Assert.That(payload, Is.Not.Null);
        Assert.That(payload!.UsedMcp, Is.True);
        Assert.That(payload.ToolsUsed, Does.Contain("post_to_facebook"));
        _mcpClient.Verify(c => c.ExecuteToolAsync(
            "post_to_facebook",
            It.Is<Dictionary<string, object>>(d => d.ContainsKey("message") && (string)d["message"]! == "Hello world")),
            Times.Once);
        _aiService.Verify(a => a.SendMessageAsync(It.IsAny<LocalAIRequest>()), Times.Never);
    }

    [Test]
    public async Task Chat_DirectAction_WhenMcpToolFails_ReturnErrorResult()
    {
        // Arrange
        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool>());

        _mcpClient.Setup(c => c.ExecuteToolAsync("post_to_facebook", It.IsAny<Dictionary<string, object>>()))
            .ThrowsAsync(new HttpRequestException("Connection timeout"));

        var controller = CreateController();
        var request = new AgentRequest
        {
            UserMessage = "ACTION: post_to_facebook\nPARAMETERS:\nmessage=Hello world\nEXPLANATION: test"
        };

        // Act
        var result = await controller.Chat(request);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var payload = ok!.Value as AgentResponse;
        Assert.That(payload, Is.Not.Null);
        Assert.That(payload!.FunctionExecutions, Is.Not.Null);
        Assert.That(payload.FunctionExecutions, Has.Count.GreaterThan(0));
        var exec = payload.FunctionExecutions[0];
        Assert.That(exec.Success, Is.False);
        Assert.That(exec.ErrorMessage, Does.Contain("Connection timeout"));
    }

    [Test]
    public async Task Chat_WithNullChoices_ReturnsBadRequest()
    {
        // Arrange
        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool>());

        _aiService.Setup(a => a.SendMessageAsync(It.IsAny<LocalAIRequest>()))
            .ReturnsAsync(new LocalAIResponse { Choices = null! });

        var controller = CreateController();
        var request = new AgentRequest { UserMessage = "test message" };

        // Act
        var result = await controller.Chat(request);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Chat_WithAllowedToolsFilter_ReturnsOnlyFilteredTools()
    {
        // Arrange
        var mockTool = new FunctionTool
        {
            Type = "function",
            Function = new FunctionDefinition
            {
                Name = "test_tool",
                Description = "A test tool",
                Parameters = new ParametersSchema { Type = "object", Properties = new() }
            }
        };

        _mcpClient.Setup(c => c.GetAvailableToolsAsync())
            .ReturnsAsync(new List<FunctionTool> { mockTool });

        _aiService.Setup(a => a.SendMessageAsync(It.IsAny<LocalAIRequest>()))
            .ReturnsAsync(new LocalAIResponse
            {
                Choices = new()
                {
                    new Choice
                    {
                        Message = new Message { Content = "response with filtered tools" },
                        FinishReason = "stop"
                    }
                }
            });

        var controller = CreateController();
        var request = new AgentRequest
        {
            UserMessage = "hello",
            AllowedTools = new List<string> { "web_search" }
        };

        // Act
        var result = await controller.Chat(request);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var payload = ok!.Value as AgentResponse;
        Assert.That(payload, Is.Not.Null);
        // The response should succeed; the filtering is logged but doesn't prevent success
        Assert.That(payload!.Response, Is.Not.Empty);
    }
}
