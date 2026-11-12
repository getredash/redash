---
title: Amazon Redshift
---

## How to Configure Security Groups

1. Begin at the Amazon Redshift console navigation pane. Choose **Clusters**.
2. Open your cluster to the **Configuration** tab.
3. Under _Cluster Properties_ → _VPC Security Groups_ choose your security
   group. It will open in the Amazon EC2 console.

![image](/assets/images/docs/gitbook/redshift-vpc-security-groups.png)

4. Choose the **Inbound** tab.

![image](/assets/images/docs/gitbook/redshift-inbound-tab.png)

5.  Here you can add a rule that allows traffic into your cluster. You can
    configure this to accept inbound connections from your Redash host. Click
    **Edit** and then

        	- For **Type** choose `Custom TCP Rule`
        	- For **Protocol** choose `TCP`
        	- For **Port Range** type the same port number that you used when you
        	launched the cluster. The default port for Amazon Redshift is `5439`.
        	Yours may be different.
        	- For **Source** pick `Custom IP` and enter your Redash instance's IP
        	address. If you use hosted Redash enter `52.71.84.157/32`. This is our
        	public IP address.
        	- Click **Save**
