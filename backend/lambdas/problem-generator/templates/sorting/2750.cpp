// BOJ - 2750

#include <iostream>
#include <algorithm>
#include <queue>

using namespace std;


priority_queue<int,vector<int>,greater<int> > pq;

int main()
{
	cin.tie(0);
	ios_base::sync_with_stdio(false);
	int n;
	cin >> n;
	for(int i=1; i<=n; i++)
	{
		int _t;
		cin >> _t;
		pq.push(_t);
	}
	while(!pq.empty())
	{
		cout << pq.top() << '\n';
		pq.pop();
	}
}