// BOJ - 1931

#include <iostream>
#include <algorithm>

using namespace std;

struct Meet{
	int s,e;
	
};

bool cmp(const Meet& A,const Meet& B)
{
	if(A.e==B.e) return A.s < B.s;
	return A.e < B.e;
}

int main()
{
	int n;
	cin >> n;
	Meet data[n];
	for(int i=0; i<n; i++)
	{
		int s,e;
		cin >> s >> e;
		data[i] = {s,e};
	}
	sort(data,data+n,cmp);
	int ans = 0,p = 0;
	for(int i=0; i<n; i++)
		if(p<=data[i].s)
			ans++,p=data[i].e;
	cout << ans;
}